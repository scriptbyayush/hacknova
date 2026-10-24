from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from datetime import datetime

from models import (
    MeetingAnalysisRequest, MeetingAnalysisResponse, TaskItem,
    ClassificationType, TaskPriority, TaskStatus, ApprovalStatus,
    TaskApprovalRequest, BatchApprovalRequest, ExportRequest, ExportResult
)
from ai_engine import process_meeting_transcript
from conflict_detector import detect_conflicts
from integrations import export_to_trello
import asyncio
import github_service
import firestore_service
from google_meet import router as google_meet_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meetflow")

app = FastAPI(
    title="MeetFlow AI — Meeting-to-Execution Automation API",
    description="Transforms meeting discussions into approved, trackable tasks for GitHub and Trello.",
    version="2.0.0"
)


app.include_router(google_meet_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store
STORE: Dict[str, Any] = {
    "meetings": [],
    "tasks": {},
    "current_meeting_id": None,
    "publication_log": []
}

SAMPLE_SLIDE_TRANSCRIPT = """Ayush: Let's finish the login page by Friday. Rahul can investigate Google login, but we haven't decided whether to include it.
Rahul: Sounds good. Ayush, can you also update the API documentation by Monday?
Ayush: Yes, I will update the API documentation by Monday."""


@app.on_event("startup")
async def startup_event():
    res = await process_meeting_transcript(
        transcript=SAMPLE_SLIDE_TRANSCRIPT,
        title="Hacknova Team Sprint Planning"
    )
    STORE["meetings"].append(res)
    STORE["current_meeting_id"] = res.meeting_id
    for t in res.tasks:
        STORE["tasks"][t.id] = t
    logger.info(f"[STARTUP] Seeded {len(res.tasks)} tasks from benchmark transcript.")
    # Persist benchmark to Cloud Firestore collections
    asyncio.create_task(firestore_service.save_meeting(res))
    for t in res.tasks:
        asyncio.create_task(firestore_service.save_task(t, res.meeting_id))
    asyncio.create_task(firestore_service.log_audit_event("startup_seeded", meeting_id=res.meeting_id, details={"tasks_count": len(res.tasks)}))


@app.get("/")
def root():
    return {
        "service": "MeetFlow AI — Automation Agent",
        "status": "online",
        "version": "2.0.0",
        "hackathon": "HACKNOVA'26",
        "docs_url": "/docs"
    }


# ─── Meeting Analysis ─────────────────────────────────────────────────────────

@app.post("/api/analyze-transcript", response_model=MeetingAnalysisResponse)
async def analyze_transcript(req: MeetingAnalysisRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty.")

    result = await process_meeting_transcript(
        transcript=req.transcript,
        title=req.title,
        llm_api_key=req.llm_api_key,
        llm_provider=req.llm_provider or "local"
    )
    STORE["meetings"].append(result)
    STORE["current_meeting_id"] = result.meeting_id
    for t in result.tasks:
        STORE["tasks"][t.id] = t
    # Store meeting and tasks in Firestore collections
    asyncio.create_task(firestore_service.save_meeting(result))
    for t in result.tasks:
        asyncio.create_task(firestore_service.save_task(t, result.meeting_id))
    asyncio.create_task(firestore_service.log_audit_event("transcript_analyzed", meeting_id=result.meeting_id, details={"title": result.title, "tasks_count": len(result.tasks)}))
    return result


# ─── Task Management ──────────────────────────────────────────────────────────

@app.get("/api/tasks", response_model=List[TaskItem])
def get_tasks(
    status: Optional[str] = None,
    classification: Optional[str] = None,
    approval: Optional[str] = None
):
    tasks = list(STORE["tasks"].values())
    if status:
        tasks = [t for t in tasks if t.status.value == status]
    if classification:
        tasks = [t for t in tasks if t.classification.value == classification]
    if approval:
        tasks = [t for t in tasks if t.approval_status.value == approval]
    return tasks


@app.post("/api/tasks/{task_id}/action", response_model=TaskItem)
def handle_task_action(task_id: str, payload: TaskApprovalRequest):
    if task_id not in STORE["tasks"]:
        raise HTTPException(status_code=404, detail="Task not found")

    task = STORE["tasks"][task_id]
    action = payload.action.lower()

    if action == "approve":
        task.approval_status = ApprovalStatus.APPROVED
        task.status = TaskStatus.TODO
    elif action == "reject":
        task.approval_status = ApprovalStatus.REJECTED
    elif action == "promote":
        task.classification = ClassificationType.CONFIRMED
        task.approval_status = ApprovalStatus.APPROVED
        task.status = TaskStatus.TODO
        if task.deadline in ["Pending Approval", "Not specified"]:
            task.deadline = "Friday"
    elif action == "dismiss":
        task.approval_status = ApprovalStatus.DISMISSED

    if payload.updates:
        for k, v in payload.updates.items():
            if hasattr(task, k):
                setattr(task, k, v)

    detect_conflicts(list(STORE["tasks"].values()))
    # Sync task update & audit log to Firestore
    asyncio.create_task(firestore_service.update_task_fields(task_id, {
        "approval_status": task.approval_status.value,
        "status": task.status.value,
        "classification": task.classification.value,
        "deadline": task.deadline
    }))
    asyncio.create_task(firestore_service.log_audit_event(f"task_{action}", task_id=task_id, task_title=task.title))
    return task


@app.post("/api/tasks/batch-approve", response_model=List[TaskItem])
def batch_approve(payload: BatchApprovalRequest):
    updated = []
    for tid in payload.task_ids:
        if tid in STORE["tasks"]:
            t = STORE["tasks"][tid]
            t.approval_status = ApprovalStatus.APPROVED
            if t.classification == ClassificationType.SUGGESTION:
                t.classification = ClassificationType.CONFIRMED
            t.status = TaskStatus.TODO
            updated.append(t)
    return updated


# ─── GitHub Integration ───────────────────────────────────────────────────────

class GitHubVerifyRequest(BaseModel):
    owner: str
    repo: str
    token: Optional[str] = None


class GitHubPublishRequest(BaseModel):
    task_ids: List[str]
    owner: str
    repo: str
    token: str


class GitHubRetryRequest(BaseModel):
    task_id: str
    owner: str
    repo: str


@app.post("/api/github/verify")
async def verify_github_repo(req: GitHubVerifyRequest):
    """
    Verify GitHub repository accessibility.
    Token is accepted server-side; never echoed back.
    """
    result = await github_service.verify_repository(req.owner, req.repo, req.token)
    # Never return the token
    return result


@app.post("/api/github/publish", response_model=ExportResult)
async def publish_to_github(req: GitHubPublishRequest):
    """
    Publish approved tasks as GitHub Issues.
    - Only approved tasks are exported.
    - Duplicate-publication protection via registry.
    - Token stays server-side.
    """
    if not req.token or not req.token.strip():
        raise HTTPException(status_code=400, detail="GitHub token is required.")
    if not req.owner or not req.repo:
        raise HTTPException(status_code=400, detail="Repository owner and name are required.")

    tasks_to_export = [
        STORE["tasks"][tid]
        for tid in req.task_ids
        if tid in STORE["tasks"] and STORE["tasks"][tid].approval_status == ApprovalStatus.APPROVED
    ]

    if not tasks_to_export:
        raise HTTPException(status_code=400, detail="No approved tasks selected for export. Approve tasks in the Review Center first.")

    # Determine meeting title for issue body context
    meeting_title = None
    if STORE["current_meeting_id"]:
        meeting = next((m for m in STORE["meetings"] if m.meeting_id == STORE["current_meeting_id"]), None)
        if meeting:
            meeting_title = meeting.title

    results = []
    for task in tasks_to_export:
        result = await github_service.create_issue(
            task=task,
            owner=req.owner,
            repo=req.repo,
            token=req.token,
            meeting_title=meeting_title,
        )
        results.append(result)

        # Log to publication audit log & Cloud Firestore
        STORE["publication_log"].append({
            "timestamp": datetime.utcnow().isoformat(),
            "task_id": task.id,
            "task_title": task.title,
            "repo": f"{req.owner}/{req.repo}",
            "result": result.get("status"),
            "issue_number": result.get("issue_number"),
            "issue_url": result.get("external_url"),
        })
        if result.get("external_url"):
            asyncio.create_task(firestore_service.update_task_fields(task.id, {
                "github_issue_url": result.get("external_url")
            }))
        asyncio.create_task(firestore_service.log_audit_event(
            action="github_issue_dispatched",
            task_id=task.id,
            task_title=task.title,
            details={
                "repo": f"{req.owner}/{req.repo}",
                "issue_number": result.get("issue_number"),
                "issue_url": result.get("external_url"),
                "status": result.get("status")
            }
        ))

    success_count = sum(1 for r in results if r.get("status") == "success")
    dup_count = sum(1 for r in results if r.get("status") == "already_published")
    fail_count = len(results) - success_count - dup_count

    status_msg = f"completed ({success_count} created, {dup_count} duplicate-prevented, {fail_count} failed)"

    return ExportResult(
        exported_count=success_count,
        target="GitHub Issues",
        details=results,
        status=status_msg
    )


@app.post("/api/github/retry")
async def retry_github_publish(req: GitHubRetryRequest, token: str = Query(...)):
    """Clear duplicate registry for a task and allow retry."""
    cleared = github_service.clear_registry_for_task(req.task_id, req.owner, req.repo)
    return {"cleared": cleared, "task_id": req.task_id, "repo": f"{req.owner}/{req.repo}"}


@app.get("/api/github/publication-log")
def get_publication_log():
    """Return the publication audit log."""
    return {
        "log": STORE["publication_log"][-50:],  # Last 50 entries
        "total": len(STORE["publication_log"])
    }


# ─── Export (legacy + Trello) ─────────────────────────────────────────────────

@app.post("/api/export", response_model=ExportResult)
async def export_tasks(req: ExportRequest):
    """Legacy export endpoint. GitHub publishing now uses /api/github/publish."""
    tasks_to_export = [
        STORE["tasks"][tid] for tid in req.task_ids
        if tid in STORE["tasks"] and STORE["tasks"][tid].approval_status == ApprovalStatus.APPROVED
    ]

    if not tasks_to_export:
        raise HTTPException(status_code=400, detail="No approved tasks selected for export.")

    if req.target.value == "trello":
        return await export_to_trello(tasks_to_export, req)

    # For github/sandbox via legacy route — use sandbox mode
    from integrations import export_to_github
    return await export_to_github(tasks_to_export, req)


# ─── Dashboard Stats ──────────────────────────────────────────────────────────


@app.get("/api/firestore/status")
async def get_firestore_status():
    """Retrieve live document counts from Cloud Firestore collections."""
    return await firestore_service.get_collections_summary()

@app.get("/api/stats")
def get_dashboard_stats():
    tasks = list(STORE["tasks"].values())
    total = len(tasks)
    approved = sum(1 for t in tasks if t.approval_status == ApprovalStatus.APPROVED)
    pending = sum(1 for t in tasks if t.approval_status == ApprovalStatus.PENDING)
    confirmed = sum(1 for t in tasks if t.classification == ClassificationType.CONFIRMED)
    suggestions = sum(1 for t in tasks if t.classification == ClassificationType.SUGGESTION)
    conflicts = sum(len(t.conflicts) for t in tasks)
    published_to_github = sum(1 for t in tasks if t.github_issue_url and not t.github_issue_url.startswith("https://github.com/scriptbyayush/hacknova/issues/new"))
    exported = sum(1 for t in tasks if t.github_issue_url or t.trello_card_url)

    workload: Dict[str, int] = {}
    for t in tasks:
        assignee = t.assignee or "Unassigned"
        workload[assignee] = workload.get(assignee, 0) + 1

    status_dist: Dict[str, int] = {}
    for t in tasks:
        s = t.status.value if hasattr(t.status, 'value') else t.status
        status_dist[s] = status_dist.get(s, 0) + 1

    return {
        "total_tasks": total,
        "approved": approved,
        "pending_review": pending,
        "confirmed_commitments": confirmed,
        "suggestions": suggestions,
        "active_conflicts": conflicts,
        "exported_to_tools": exported,
        "published_to_github": published_to_github,
        "total_meetings": len(STORE["meetings"]),
        "publication_events": len(STORE["publication_log"]),
        "workload_by_member": workload,
        "status_distribution": status_dist,
        "time_saved_minutes": total * 15
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
