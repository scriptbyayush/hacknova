from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uvicorn
from datetime import datetime

from models import (
    MeetingAnalysisRequest, MeetingAnalysisResponse, TaskItem,
    ClassificationType, TaskPriority, TaskStatus, ApprovalStatus,
    TaskApprovalRequest, BatchApprovalRequest, ExportRequest, ExportResult
)
from ai_engine import process_meeting_transcript
from conflict_detector import detect_conflicts
from integrations import export_to_github, export_to_trello
from google_meet import router as google_meet_router

app = FastAPI(
    title="MeetFlow AI — Meeting-to-Execution Automation API",
    description="Transforms meeting discussions into approved, trackable tasks for GitHub and Trello.",
    version="1.0.0"
)

app.include_router(google_meet_router)


# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for meetings and tasks
STORE: Dict[str, Any] = {
    "meetings": [],
    "tasks": {},
    "current_meeting_id": None
}

# Seed with the official slide example initially
SAMPLE_SLIDE_TRANSCRIPT = """Ayush: Let's finish the login page by Friday. Rahul can investigate Google login, but we haven't decided whether to include it.
Rahul: Sounds good. Ayush, can you also update the API documentation by Monday?
Ayush: Yes, I will update the API documentation by Monday."""

@app.on_event("startup")
async def startup_event():
    # Pre-parse the sample meeting on startup
    res = await process_meeting_transcript(
        transcript=SAMPLE_SLIDE_TRANSCRIPT,
        title="Hacknova Team Sprint Planning"
    )
    STORE["meetings"].append(res)
    STORE["current_meeting_id"] = res.meeting_id
    for t in res.tasks:
        STORE["tasks"][t.id] = t

@app.get("/")
def root():
    return {
        "service": "MeetFlow AI — Automation Agent",
        "status": "online",
        "hackathon": "HACKNOVA'26",
        "docs_url": "/docs"
    }

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
        
    return result

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
        # Promote suggestion to confirmed commitment
        task.classification = ClassificationType.CONFIRMED
        task.approval_status = ApprovalStatus.APPROVED
        task.status = TaskStatus.TODO
        if task.deadline in ["Pending Approval", "Not specified"]:
            task.deadline = "Friday"
    elif action == "dismiss":
        task.approval_status = ApprovalStatus.DISMISSED

    # Apply manual overrides if provided
    if payload.updates:
        for k, v in payload.updates.items():
            if hasattr(task, k):
                setattr(task, k, v)

    # Re-run conflict check
    detect_conflicts(list(STORE["tasks"].values()))
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

@app.post("/api/export", response_model=ExportResult)
async def export_tasks(req: ExportRequest):
    tasks_to_export = [
        STORE["tasks"][tid] for tid in req.task_ids
        if tid in STORE["tasks"] and STORE["tasks"][tid].approval_status == ApprovalStatus.APPROVED
    ]
    
    if not tasks_to_export:
        raise HTTPException(status_code=400, detail="No approved tasks selected for export.")

    if req.target.value == "github":
        result = await export_to_github(tasks_to_export, req)
    elif req.target.value == "trello":
        result = await export_to_trello(tasks_to_export, req)
    else: # sandbox
        result = await export_to_github(tasks_to_export, req)
        
    return result

@app.get("/api/stats")
def get_dashboard_stats():
    tasks = list(STORE["tasks"].values())
    total = len(tasks)
    approved = sum(1 for t in tasks if t.approval_status == ApprovalStatus.APPROVED)
    pending = sum(1 for t in tasks if t.approval_status == ApprovalStatus.PENDING)
    confirmed = sum(1 for t in tasks if t.classification == ClassificationType.CONFIRMED)
    suggestions = sum(1 for t in tasks if t.classification == ClassificationType.SUGGESTION)
    conflicts = sum(len(t.conflicts) for t in tasks)
    exported = sum(1 for t in tasks if t.github_issue_url or t.trello_card_url)

    # Workload breakdown
    workload = {}
    for t in tasks:
        assignee = t.assignee or "Unassigned"
        workload[assignee] = workload.get(assignee, 0) + 1

    return {
        "total_tasks": total,
        "approved": approved,
        "pending_review": pending,
        "confirmed_commitments": confirmed,
        "suggestions": suggestions,
        "active_conflicts": conflicts,
        "exported_to_tools": exported,
        "workload_by_member": workload,
        "time_saved_minutes": total * 15 # estimate 15 mins saved per task conversion
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
