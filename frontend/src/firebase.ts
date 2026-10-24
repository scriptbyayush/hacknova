import type { MeetingAnalysisResponse, TaskItem } from './types';

// Web app's Firebase configuration targeting projects/vipto-crm/databases/(default)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCH14V4OJc0-F02h1m_g_DZNN27lyI09pE',
  authDomain: 'vipto-crm.firebaseapp.com',
  projectId: 'vipto-crm',
  storageBucket: 'vipto-crm.firebasestorage.app',
  messagingSenderId: '775011825026',
  appId: '1:775011825026:web:51de711a05c22732bc0b9b',
  measurementId: 'G-XFVFZGKS13'
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/**
 * Converts a JS object into Firestore REST API value structure
 */
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: item.toString() };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (typeof item === 'object' && item !== null) return { mapValue: { fields: toFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

/**
 * Converts Firestore REST Document to plain JavaScript object
 */
function fromFirestoreDocument(doc: any): any {
  if (!doc || !doc.fields) return null;
  const result: Record<string, any> = {};
  for (const [key, valObj] of Object.entries(doc.fields as Record<string, any>)) {
    if ('stringValue' in valObj) result[key] = valObj.stringValue;
    else if ('integerValue' in valObj) result[key] = parseInt(valObj.integerValue, 10);
    else if ('doubleValue' in valObj) result[key] = valObj.doubleValue;
    else if ('booleanValue' in valObj) result[key] = valObj.booleanValue;
    else if ('nullValue' in valObj) result[key] = null;
    else if ('arrayValue' in valObj) {
      result[key] = ((valObj.arrayValue && valObj.arrayValue.values) || []).map((v: any) => {
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        if ('mapValue' in v) return fromFirestoreDocument(v.mapValue);
        return v;
      });
    } else if ('mapValue' in valObj) {
      result[key] = fromFirestoreDocument(valObj.mapValue);
    }
  }
  return result;
}

/**
 * Save full meeting transcript analysis to Cloud Firestore 'meetings' collection
 */
export async function saveMeetingToFirestore(meeting: MeetingAnalysisResponse): Promise<void> {
  // Always cache locally first
  localStorage.setItem(`meetflow_meeting_${meeting.meeting_id}`, JSON.stringify(meeting));
  localStorage.setItem('meetflow_latest_meeting_id', meeting.meeting_id);

  try {
    const url = `${FIRESTORE_BASE_URL}/meetings/${meeting.meeting_id}?key=${firebaseConfig.apiKey}`;
    const fields = toFirestoreFields({
      meeting_id: meeting.meeting_id,
      title: meeting.title,
      transcript: meeting.transcript,
      summary: meeting.summary,
      detected_attendees: meeting.detected_attendees,
      conflict_count: meeting.conflict_count,
      confirmed_count: meeting.confirmed_count,
      suggestion_count: meeting.suggestion_count,
      unresolved_count: meeting.unresolved_count,
      analyzed_at: meeting.analyzed_at,
      updated_at: new Date().toISOString()
    });

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      console.log(`[Cloud Firestore] Meeting ${meeting.meeting_id} written to vipto-crm.`);
    }

    // Persist tasks collection
    await saveTasksToFirestore(meeting.meeting_id, meeting.tasks);

    // Persist audit log
    await saveAuditLogToFirestore({
      action: 'meeting_analyzed',
      meetingId: meeting.meeting_id,
      details: { title: meeting.title, tasksCount: meeting.tasks.length }
    });
  } catch (err) {
    console.warn('[Cloud Firestore] Network write notice (cached in LocalStorage):', err);
  }
}

/**
 * Save array of tasks to Cloud Firestore 'tasks' collection
 */
export async function saveTasksToFirestore(meetingId: string, tasks: TaskItem[]): Promise<void> {
  for (const task of tasks) {
    try {
      const url = `${FIRESTORE_BASE_URL}/tasks/${task.id}?key=${firebaseConfig.apiKey}`;
      const fields = toFirestoreFields({
        id: task.id,
        meetingId,
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        deadline: task.deadline || 'Pending Target',
        classification: task.classification,
        priority: task.priority,
        status: task.status,
        approval_status: task.approval_status,
        confidence: task.confidence || 0.95,
        estimated_hours: task.estimated_hours || 3,
        source_quote: task.source_quote || '',
        tags: task.tags || [],
        conflicts: task.conflicts || [],
        github_issue_url: task.github_issue_url || '',
        trello_card_url: task.trello_card_url || '',
        updated_at: new Date().toISOString()
      });

      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Continue next task
    }
  }
}

/**
 * Update an existing task in Cloud Firestore
 */
export async function updateTaskInFirestore(taskId: string, updates: Partial<TaskItem>): Promise<void> {
  try {
    const url = `${FIRESTORE_BASE_URL}/tasks/${taskId}?key=${firebaseConfig.apiKey}`;
    const fields = toFirestoreFields({
      ...updates,
      updated_at: new Date().toISOString()
    });

    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(3000)
    });
  } catch (err) {
    console.warn(`[Cloud Firestore] Update for task ${taskId} cached locally.`, err);
  }
}

/**
 * Store an audit event in Cloud Firestore 'audit_logs' collection
 */
export async function saveAuditLogToFirestore(log: {
  action: string;
  taskId?: string;
  taskTitle?: string;
  meetingId?: string;
  performedBy?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const url = `${FIRESTORE_BASE_URL}/audit_logs/${logId}?key=${firebaseConfig.apiKey}`;
    const fields = toFirestoreFields({
      log_id: logId,
      action: log.action,
      task_id: log.taskId || '',
      task_title: log.taskTitle || '',
      meeting_id: log.meetingId || '',
      performed_by: log.performedBy || 'Ayush (Lead)',
      details: log.details || {},
      timestamp: new Date().toISOString()
    });

    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(3000)
    });
  } catch (err) {
    console.warn('[Cloud Firestore] Audit log write notice:', err);
  }
}

/**
 * Load latest meeting from Cloud Firestore (or fallback to local cache)
 */
export async function loadLatestMeetingFromFirestore(): Promise<MeetingAnalysisResponse | null> {
  try {
    const url = `${FIRESTORE_BASE_URL}/meetings?key=${firebaseConfig.apiKey}&pageSize=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        const parsed = fromFirestoreDocument(data.documents[0]);
        if (parsed && parsed.meeting_id) {
          // Also fetch associated tasks
          const tasksUrl = `${FIRESTORE_BASE_URL}/tasks?key=${firebaseConfig.apiKey}&pageSize=50`;
          const tasksRes = await fetch(tasksUrl, { signal: AbortSignal.timeout(3500) });
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            if (tasksData.documents && tasksData.documents.length > 0) {
              const remoteTasks: TaskItem[] = tasksData.documents
                .map((d: any) => {
                  const item = fromFirestoreDocument(d);
                  if (!item) return null;
                  return {
                    ...item,
                    conflicts: Array.isArray(item.conflicts) ? item.conflicts : [],
                    tags: Array.isArray(item.tags) ? item.tags : [],
                    assignee: item.assignee || 'Unassigned',
                    priority: item.priority || 'medium',
                    status: item.status || 'todo',
                    approval_status: item.approval_status || 'pending'
                  };
                })
                .filter((t: any) => t && t.id);
              if (remoteTasks.length > 0) {
                parsed.tasks = remoteTasks;
              }
            }
          }
          return parsed as MeetingAnalysisResponse;
        }
      }
    }
  } catch (err) {
    console.warn('[Cloud Firestore] Fallback to local meeting cache:', err);
  }

  // Fallback to local storage
  const latestId = localStorage.getItem('meetflow_latest_meeting_id');
  if (latestId) {
    const cached = localStorage.getItem(`meetflow_meeting_${latestId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  return null;
}

/**
 * Fetch live counts of stored documents in Firestore collections
 */
export async function getFirestoreCollectionsStatus(): Promise<{
  connected: boolean;
  projectId: string;
  meetingsCount: number;
  tasksCount: number;
  auditLogsCount: number;
}> {
  try {
    const [meetingsRes, tasksRes, logsRes] = await Promise.all([
      fetch(`${FIRESTORE_BASE_URL}/meetings?key=${firebaseConfig.apiKey}&pageSize=100`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${FIRESTORE_BASE_URL}/tasks?key=${firebaseConfig.apiKey}&pageSize=100`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${FIRESTORE_BASE_URL}/audit_logs?key=${firebaseConfig.apiKey}&pageSize=100`, { signal: AbortSignal.timeout(3000) })
    ]);

    const meetingsData = meetingsRes.ok ? await meetingsRes.json() : { documents: [] };
    const tasksData = tasksRes.ok ? await tasksRes.json() : { documents: [] };
    const logsData = logsRes.ok ? await logsRes.json() : { documents: [] };

    return {
      connected: true,
      projectId: firebaseConfig.projectId,
      meetingsCount: meetingsData.documents?.length || 0,
      tasksCount: tasksData.documents?.length || 0,
      auditLogsCount: logsData.documents?.length || 0
    };
  } catch {
    return {
      connected: false,
      projectId: firebaseConfig.projectId,
      meetingsCount: 0,
      tasksCount: 0,
      auditLogsCount: 0
    };
  }
}
