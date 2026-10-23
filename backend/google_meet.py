import os
import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(tags=["Google Meet & Vipto Integration"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://meetflow.vipto.in/")

class GoogleMeetConferenceModel(BaseModel):
    conferenceId: str
    spaceId: str
    title: str
    startTime: str
    endTime: str
    transcriptState: str
    transcriptUrl: Optional[str] = None
    transcriptContent: Optional[str] = None
    attendees: List[str]

# In-memory store for Google Meet transcripts
CONFERENCES_CACHE: List[Dict[str, Any]] = [
    {
        "conferenceId": "conf-meet-vipto-01",
        "spaceId": "spaces/vip-meet-892",
        "title": "Vipto Sprint Sync — Auth & API Planning (Google Meet)",
        "startTime": "Today, 10:00 AM",
        "endTime": "Today, 10:35 AM",
        "transcriptState": "FILE_GENERATED",
        "attendees": ["Ayush (Lead)", "Rahul (Backend)", "Priya (QA)"],
        "transcriptContent": """Ayush: I will complete the login page by Friday.
Rahul: Rahul suggested adding Google login, but the team hasn't finalized it yet.
Rahul: Ayush, can you also update the API documentation by Monday?
Ayush: Yes, I will update the API documentation by Monday.""",
        "transcriptUrl": "https://docs.google.com/document/d/vipto-meet-transcript-892/view"
    },
    {
        "conferenceId": "conf-meet-vipto-02",
        "spaceId": "spaces/vip-pay-142",
        "title": "Vipto Architecture & Payments Engine Review",
        "startTime": "Yesterday, 3:00 PM",
        "endTime": "Yesterday, 3:45 PM",
        "transcriptState": "FILE_GENERATED",
        "attendees": ["Ayush (Lead)", "Alex (DevOps)", "Sarah (Database)"],
        "transcriptContent": """Alex: Team, we need to optimize our PostgreSQL database queries before Friday.
Sarah: Wait, I already committed to database query optimization and indexing for Friday.
Alex: Okay, then someone should also test the checkout workflow soon.
Rahul: I will finalize the Stripe checkout integration and payment webhooks by Thursday.
Priya: Rahul suggested adding crypto payments, but the leadership team hasn't approved it yet.
Alex: Do we need a separate staging database for QA? That's still an open question.""",
        "transcriptUrl": "https://docs.google.com/document/d/vipto-meet-transcript-142/view"
    }
]

@router.get("/api/google-meet/config")
def get_google_meet_config():
    """Returns public OAuth configuration for Google Meet integration."""
    return {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scopes": [
            "https://www.googleapis.com/auth/meetings.space.readonly",
            "https://www.googleapis.com/auth/drive.readonly"
        ],
        "state": "ready"
    }

@router.get("/api/google-meet/conferences")
def list_google_meet_conferences():
    """Lists available Google Meet conferences and transcript readiness."""
    return CONFERENCES_CACHE

@router.get("/api/google-meet/conferences/{conference_id}")
def get_conference_transcript(conference_id: str):
    """Fetches the raw transcript lines for a specific Google Meet conference."""
    for conf in CONFERENCES_CACHE:
        if conf["conferenceId"] == conference_id:
            return conf
    raise HTTPException(status_code=404, detail="Google Meet conference not found.")

@router.post("/api/webhooks/google-meet-transcript")
def google_workspace_events_webhook(payload: Dict[str, Any] = Body(...)):
    """
    Receives Google Workspace Events API webhook when a Google Meet transcript
    reaches the FILE_GENERATED state.
    """
    event_type = payload.get("eventType", "")
    data = payload.get("data", {})
    
    # Check for file generated event
    if "fileGenerated" in event_type or data.get("transcriptState") == "FILE_GENERATED":
        conf_id = data.get("conferenceId", f"conf-auto-{int(datetime.utcnow().timestamp())}")
        CONFERENCES_CACHE.insert(0, {
            "conferenceId": conf_id,
            "spaceId": data.get("spaceId", "spaces/auto-detected"),
            "title": data.get("title", f"Google Meet #{conf_id}"),
            "startTime": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "endTime": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "transcriptState": "FILE_GENERATED",
            "attendees": data.get("attendees", ["Ayush", "Rahul"]),
            "transcriptContent": data.get("transcriptContent", ""),
            "transcriptUrl": data.get("transcriptUrl", "")
        })
        return {
            "status": "received",
            "event": event_type,
            "conferenceId": conf_id,
            "message": "Transcript registered successfully. Ready for AI processing."
        }
    
    return {"status": "ignored", "event": event_type}
