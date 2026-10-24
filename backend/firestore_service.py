"""
MeetFlow AI — Firestore Database Service
Handles all Google Cloud Firestore interactions via REST API for persistence and audit logging.
Target: projects/vipto-crm/databases/(default)/documents
"""
import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("meetflow.firestore")

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "vipto-crm")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyCH14V4OJc0-F02h1m_g_DZNN27lyI09pE")

FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"


def to_firestore_fields(obj: Any) -> Dict[str, Any]:
    """Converts a Python dict/object into Firestore REST value mapping."""
    if not isinstance(obj, dict):
        return {}

    fields: Dict[str, Any] = {}
    for key, val in obj.items():
        if val is None:
            fields[key] = {"nullValue": None}
        elif isinstance(val, bool):
            fields[key] = {"booleanValue": val}
        elif isinstance(val, int):
            fields[key] = {"integerValue": str(val)}
        elif isinstance(val, float):
            fields[key] = {"doubleValue": val}
        elif isinstance(val, str):
            fields[key] = {"stringValue": val}
        elif isinstance(val, list):
            fields[key] = {
                "arrayValue": {
                    "values": [
                        {"stringValue": str(item)} if not isinstance(item, (dict, list, bool, int, float))
                        else {"mapValue": {"fields": to_firestore_fields(item)}} if isinstance(item, dict)
                        else {"integerValue": str(item)} if isinstance(item, int) and not isinstance(item, bool)
                        else {"booleanValue": item} if isinstance(item, bool)
                        else {"stringValue": str(item)}
                        for item in val
                    ]
                }
            }
        elif isinstance(val, dict):
            fields[key] = {"mapValue": {"fields": to_firestore_fields(val)}}
        else:
            fields[key] = {"stringValue": str(val)}
    return fields


def from_firestore_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a Firestore REST Document into a plain Python dictionary."""
    if not doc or "fields" not in doc:
        return {}
    res = {}
    for key, val_obj in doc["fields"].items():
        if "stringValue" in val_obj:
            res[key] = val_obj["stringValue"]
        elif "integerValue" in val_obj:
            res[key] = int(val_obj["integerValue"])
        elif "doubleValue" in val_obj:
            res[key] = float(val_obj["doubleValue"])
        elif "booleanValue" in val_obj:
            res[key] = val_obj["booleanValue"]
        elif "nullValue" in val_obj:
            res[key] = None
        elif "arrayValue" in val_obj:
            res[key] = [
                v.get("stringValue") or v.get("integerValue") or v.get("booleanValue")
                for v in val_obj.get("arrayValue", {}).get("values", [])
            ]
        elif "mapValue" in val_obj:
            res[key] = from_firestore_doc(val_obj["mapValue"])
    return res


async def save_meeting(meeting: Any) -> bool:
    """Save full meeting transcript analysis to Cloud Firestore 'meetings' collection."""
    meeting_dict = meeting.model_dump() if hasattr(meeting, "model_dump") else meeting.dict() if hasattr(meeting, "dict") else dict(meeting)
    meeting_id = meeting_dict.get("meeting_id")
    if not meeting_id:
        return False

    url = f"{FIRESTORE_BASE_URL}/meetings/{meeting_id}?key={FIREBASE_API_KEY}"
    payload = {
        "fields": to_firestore_fields({
            "meeting_id": meeting_id,
            "title": meeting_dict.get("title", "Sprint Meeting"),
            "transcript": meeting_dict.get("transcript", ""),
            "summary": meeting_dict.get("summary", {}),
            "detected_attendees": meeting_dict.get("detected_attendees", []),
            "conflict_count": meeting_dict.get("conflict_count", 0),
            "confirmed_count": meeting_dict.get("confirmed_count", 0),
            "suggestion_count": meeting_dict.get("suggestion_count", 0),
            "unresolved_count": meeting_dict.get("unresolved_count", 0),
            "analyzed_at": meeting_dict.get("analyzed_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
        if res.status_code in (200, 201):
            logger.info(f"[FIRESTORE] Meeting {meeting_id} saved to Firestore successfully.")
            return True
        else:
            logger.warning(f"[FIRESTORE] Failed to save meeting {meeting_id}: HTTP {res.status_code} {res.text[:120]}")
            return False
    except Exception as e:
        logger.warning(f"[FIRESTORE] Error saving meeting to Firestore: {str(e)[:80]}")
        return False


async def save_task(task: Any, meeting_id: Optional[str] = None) -> bool:
    """Save or update task in Cloud Firestore 'tasks' collection."""
    task_dict = task.model_dump() if hasattr(task, "model_dump") else task.dict() if hasattr(task, "dict") else dict(task)
    task_id = task_dict.get("id")
    if not task_id:
        return False

    url = f"{FIRESTORE_BASE_URL}/tasks/{task_id}?key={FIREBASE_API_KEY}"
    payload = {
        "fields": to_firestore_fields({
            "id": task_id,
            "meetingId": meeting_id or task_dict.get("meetingId", ""),
            "title": task_dict.get("title", ""),
            "description": task_dict.get("description", ""),
            "assignee": task_dict.get("assignee", "Unassigned"),
            "deadline": task_dict.get("deadline", "Not specified"),
            "classification": getattr(task_dict.get("classification"), "value", task_dict.get("classification")),
            "priority": getattr(task_dict.get("priority"), "value", task_dict.get("priority")),
            "status": getattr(task_dict.get("status"), "value", task_dict.get("status")),
            "approval_status": getattr(task_dict.get("approval_status"), "value", task_dict.get("approval_status")),
            "confidence": task_dict.get("confidence", 0.95),
            "tags": task_dict.get("tags", []),
            "estimated_hours": task_dict.get("estimated_hours", 3),
            "source_quote": task_dict.get("source_quote", ""),
            "github_issue_url": task_dict.get("github_issue_url"),
            "trello_card_url": task_dict.get("trello_card_url"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
        return res.status_code in (200, 201)
    except Exception as e:
        logger.warning(f"[FIRESTORE] Error saving task {task_id}: {str(e)[:80]}")
        return False


async def update_task_fields(task_id: str, updates: Dict[str, Any]) -> bool:
    """Partially update task fields in Cloud Firestore."""
    url = f"{FIRESTORE_BASE_URL}/tasks/{task_id}?key={FIREBASE_API_KEY}"
    clean_updates = {
        k: (v.value if hasattr(v, "value") else v)
        for k, v in updates.items()
    }
    clean_updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    payload = {"fields": to_firestore_fields(clean_updates)}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
        return res.status_code in (200, 201)
    except Exception as e:
        logger.warning(f"[FIRESTORE] Error updating task {task_id}: {str(e)[:80]}")
        return False


async def log_audit_event(
    action: str,
    task_id: Optional[str] = None,
    task_title: Optional[str] = None,
    meeting_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    performed_by: str = "Lead (Ayush)"
) -> bool:
    """Store audit event in Cloud Firestore 'audit_logs' collection."""
    timestamp = datetime.now(timezone.utc).isoformat()
    log_id = f"log-{int(datetime.now().timestamp() * 1000)}"
    url = f"{FIRESTORE_BASE_URL}/audit_logs/{log_id}?key={FIREBASE_API_KEY}"

    payload = {
        "fields": to_firestore_fields({
            "log_id": log_id,
            "action": action,
            "task_id": task_id or "",
            "task_title": task_title or "",
            "meeting_id": meeting_id or "",
            "performed_by": performed_by,
            "details": details or {},
            "timestamp": timestamp,
        })
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
        if res.status_code in (200, 201):
            logger.info(f"[FIRESTORE] Audit log recorded: {action} ({log_id})")
            return True
        return False
    except Exception as e:
        logger.warning(f"[FIRESTORE] Error writing audit log: {str(e)[:80]}")
        return False


async def get_collections_summary() -> Dict[str, Any]:
    """Retrieve document count metadata across meetings, tasks, and audit_logs."""
    summary = {
        "project_id": FIREBASE_PROJECT_ID,
        "database": "(default)",
        "status": "connected",
        "collections": {}
    }

    collections = ["meetings", "tasks", "audit_logs"]
    async with httpx.AsyncClient(timeout=6.0) as client:
        for col in collections:
            try:
                url = f"{FIRESTORE_BASE_URL}/{col}?key={FIREBASE_API_KEY}&pageSize=100"
                res = await client.get(url)
                if res.status_code == 200:
                    docs = res.json().get("documents", [])
                    summary["collections"][col] = {
                        "count": len(docs),
                        "status": "active"
                    }
                else:
                    summary["collections"][col] = {
                        "count": 0,
                        "status": f"HTTP {res.status_code}"
                    }
            except Exception as e:
                summary["collections"][col] = {
                    "count": 0,
                    "status": str(e)[:40]
                }

    return summary
