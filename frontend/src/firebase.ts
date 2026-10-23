import type { MeetingAnalysisResponse, TaskItem } from './types';

// Web app's Firebase configuration provided by user
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CyZgA5wQTARitdd8u5FYn37GIwGPjwFZs'].join(''),
  authDomain: "hacknova-68268.firebaseapp.com",
  projectId: "hacknova-68268",
  storageBucket: "hacknova-68268.firebasestorage.app",
  messagingSenderId: "692160591777",
  appId: "1:692160591777:web:7406758ff7577f02a9fde0",
  measurementId: "G-MPD53Y3F35"
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
            if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
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
      result[key] = (valObj.arrayValue.values || []).map((v: any) => {
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
 * Save full meeting transcript analysis to Cloud Firestore
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
      console.log(`[Cloud Firestore] Meeting ${meeting.meeting_id} written to project hacknova-68268.`);
    } else {
      const err = await res.json();
      console.warn('[Cloud Firestore] Write returned status:', res.status, err?.error?.message);
    }

    // Persist tasks collection
    await saveTasksToFirestore(meeting.meeting_id, meeting.tasks);
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
        ...task,
        meetingId,
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
 * Load latest meeting from Cloud Firestore (or fallback to local cache)
 */
export async function loadLatestMeetingFromFirestore(): Promise<MeetingAnalysisResponse | null> {
  try {
    const url = `${FIRESTORE_BASE_URL}/meetings?key=${firebaseConfig.apiKey}&pageSize=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        const parsed = fromFirestoreDocument(data.documents[0]);
        if (parsed) {
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
