from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime

class ClassificationType(str, Enum):
    CONFIRMED = "confirmed"       # Agreed task, assigned owner, definite intent
    SUGGESTION = "suggestion"     # Proposed idea / exploratory ("Rahul suggested...")
    QUESTION = "question"         # Unresolved question / decision needed
    FOLLOWUP = "followup"         # Information sharing / check-in

class TaskPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISMISSED = "dismissed"

class ConflictType(str, Enum):
    DUPLICATE = "duplicate"
    MISSING_OWNER = "missing_owner"
    AMBIGUOUS_DEADLINE = "ambiguous_deadline"
    DEADLINE_OVERDUE = "deadline_overdue"
    RESOURCE_CONFLICT = "resource_conflict"

class ConflictWarning(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    conflict_type: ConflictType
    message: str
    severity: str = "warning" # "info", "warning", "critical"
    suggested_fix: Optional[str] = None
    related_task_id: Optional[str] = None

class TaskItem(BaseModel):
    id: str = Field(default_factory=lambda: f"task-{uuid.uuid4().hex[:6]}")
    title: str
    description: str = ""
    assignee: str = "Unassigned"
    deadline: Optional[str] = None # e.g. "2026-10-30", "Friday", "Monday"
    deadline_date: Optional[str] = None # normalized ISO date if resolvable
    classification: ClassificationType = ClassificationType.CONFIRMED
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    confidence: float = 0.95
    tags: List[str] = []
    estimated_hours: Optional[float] = 2.0
    source_quote: Optional[str] = None
    conflicts: List[ConflictWarning] = []
    github_issue_url: Optional[str] = None
    trello_card_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class MeetingAnalysisRequest(BaseModel):
    title: str = "Project Sync Meeting"
    transcript: str
    meeting_date: Optional[str] = None
    attendees: Optional[List[str]] = []
    llm_api_key: Optional[str] = None
    llm_provider: Optional[str] = "local" # "local", "gemini", "openai"

class MeetingSummary(BaseModel):
    key_decisions: List[str] = []
    discussion_points: List[str] = []
    next_meeting: Optional[str] = None
    sentiment: str = "productive"

class MeetingAnalysisResponse(BaseModel):
    meeting_id: str = Field(default_factory=lambda: f"meet-{uuid.uuid4().hex[:6]}")
    title: str
    transcript: str
    summary: MeetingSummary
    tasks: List[TaskItem]
    detected_attendees: List[str]
    conflict_count: int
    confirmed_count: int
    suggestion_count: int
    unresolved_count: int
    analyzed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class TaskApprovalRequest(BaseModel):
    task_id: str
    action: str # "approve", "reject", "promote", "dismiss"
    updates: Optional[Dict[str, Any]] = None

class BatchApprovalRequest(BaseModel):
    task_ids: List[str]
    action: str = "approve"

class ExportTarget(str, Enum):
    GITHUB = "github"
    TRELLO = "trello"
    SANDBOX = "sandbox"

class ExportRequest(BaseModel):
    task_ids: List[str]
    target: ExportTarget = ExportTarget.SANDBOX
    github_token: Optional[str] = None
    github_repo: Optional[str] = None # "owner/repo"
    trello_key: Optional[str] = None
    trello_token: Optional[str] = None
    trello_board_id: Optional[str] = None
    trello_list_id: Optional[str] = None

class ExportResult(BaseModel):
    exported_count: int
    target: str
    details: List[Dict[str, Any]]
    status: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
