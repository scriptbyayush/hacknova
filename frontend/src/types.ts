export type ClassificationType = 'confirmed' | 'suggestion' | 'question' | 'followup';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'dismissed';

export type ConflictType = 
  | 'duplicate' 
  | 'missing_owner' 
  | 'ambiguous_deadline' 
  | 'deadline_overdue' 
  | 'resource_conflict';

export interface ConflictWarning {
  id: string;
  conflict_type: ConflictType;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggested_fix?: string;
  related_task_id?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  deadline?: string;
  deadline_date?: string;
  classification: ClassificationType;
  priority: TaskPriority;
  status: TaskStatus;
  approval_status: ApprovalStatus;
  confidence: number;
  tags: string[];
  estimated_hours?: number;
  source_quote?: string;
  conflicts: ConflictWarning[];
  github_issue_url?: string;
  trello_card_url?: string;
  created_at?: string;
}

export interface MeetingSummary {
  key_decisions: string[];
  discussion_points: string[];
  next_meeting?: string;
  sentiment: string;
}

export interface MeetingAnalysisResponse {
  meeting_id: string;
  title: string;
  transcript: string;
  summary: MeetingSummary;
  tasks: TaskItem[];
  detected_attendees: string[];
  conflict_count: number;
  confirmed_count: number;
  suggestion_count: number;
  unresolved_count: number;
  analyzed_at: string;
}

export interface GoogleMeetConference {
  conferenceId: string;
  spaceId: string;
  title: string;
  startTime: string;
  endTime: string;
  transcriptState: 'FILE_GENERATED' | 'PROCESSING' | 'NOT_STARTED';
  transcriptUrl?: string;
  transcriptContent?: string;
  attendees: string[];
}

export interface AppSettings {
  llmProvider: 'local' | 'gemini' | 'openai';
  geminiApiKey: string;
  openaiApiKey: string;
  githubToken: string;
  githubRepo: string;
  trelloKey: string;
  trelloToken: string;
  trelloBoardId: string;
  trelloListId: string;
  backendUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  googleConnected?: boolean;
}

