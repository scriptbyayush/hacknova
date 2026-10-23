# 🚀 MeetFlow AI — Prototype Architecture & System Explanation

> **Meeting-to-Execution Automation Agent**  
> *Turn Every Meeting into Action.*  
> Prepared for **HACKNOVA’26** Final Round Presentation & Technical Evaluation.

---

## 📌 1. Prototype Overview

**MeetFlow AI** is an end-to-end intelligent agent designed to bridge the gap between team discussions and tangible project execution. Unlike standard meeting summarizers that merely produce passive text recaps, MeetFlow AI actively **turns conversations into approved, assigned, and trackable work**.

### Core Problem Solved:
1. **Missed Commitments:** Action items buried in transcripts are lost.
2. **Ambiguous Ownership & Deadlines:** Tasks lack single directly responsible individuals (DRI) or due dates.
3. **Idea Confusion:** Unfinalized suggestions are accidentally assigned to development sprints.
4. **Manual Friction:** Engineering managers waste 30–45 minutes per meeting copying action items into issue trackers.

---

## 🔄 2. End-to-End User Journey & Workflow

```
┌────────────────────────┐
│  1. Meeting Input      │  Paste notes, upload transcript (.txt/.vtt/.srt), or record mic audio.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  2. Gemini AI Engine   │  Multi-speaker context parsing, structured JSON schema extraction.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  3. Classification     │  Strictly categorizes: Confirmed Tasks vs. Exploratory Suggestions.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  4. Conflict & Auditing│  Token similarity for duplicate detection; flags missing owner/date.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  5. Firestore State    │  Persists meeting record, raw transcript, and extracted task drafts.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  6. Human Review Gate  │  Project manager reviews, inline edits, and promotes suggestions.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  7. API Task Dispatch  │  Creates live GitHub Issues & Trello Cards with owners & deadlines.
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  8. Execution Tracking │  Kanban dashboard & capacity analytics monitor delivery to completion.
└────────────────────────┘
```

---

## 🧠 3. Google Gemini AI Engine Integration

MeetFlow AI utilizes **Google Gemini (1.5 Flash / 3.8 Flash)** via the Gemini REST API with schema-constrained JSON output (`responseMimeType: "application/json"`).

### How the Prompting & Processing Layer Works:
- **Contextual Segmentation:** The engine cleans conversational filler (*"um"*, *"like"*, chit-chat) while strictly preserving speaker attributions and conversational cues.
- **Commitment vs. Suggestion Heuristics:**
  - **Confirmed Commitment:** Triggered by definite affirmative phrases (*"Ayush will complete..."*, *"agreed to finish..."*, *"I commit to..."*).
  - **Exploratory Suggestion:** Triggered by tentative or undecided phrases (*"Rahul suggested adding..."*, *"what if we..."*, *"we haven't finalized yet..."*).
- **JSON Schema Output:**
```json
{
  "attendees": ["Ayush", "Rahul"],
  "key_decisions": ["Agreed to finalize authentication by Friday"],
  "discussion_points": ["Explored Google OAuth 2.0 integration"],
  "tasks": [
    {
      "title": "Complete the authentication and login page",
      "description": "Finalize login screen and auth validation.",
      "assignee": "Ayush",
      "deadline": "Friday",
      "classification": "confirmed",
      "priority": "high",
      "tags": ["auth", "frontend"],
      "estimated_hours": 6.0
    },
    {
      "title": "Investigate Google login integration (Evaluate OAuth 2.0)",
      "description": "Rahul suggested adding Google login, but not finalized.",
      "assignee": "Rahul",
      "deadline": "Pending Approval",
      "classification": "suggestion",
      "priority": "low",
      "tags": ["suggestion", "auth"],
      "estimated_hours": 3.5
    }
  ]
}
```

---

## 🗄️ 4. Cloud Firestore Database Architecture

The application connects to **Google Cloud Firestore** (NoSQL Database) for scalable, real-time persistence and audit logging.

### Firestore Collections Structure:

```
firestore/
├── meetings/
│   └── {meetingId}/
│       ├── title: "Sprint 14 Sync"
│       ├── rawTranscript: "Ayush: Let's finish the login page..."
│       ├── attendees: ["Ayush", "Rahul"]
│       ├── summary: { key_decisions: [...], discussion_points: [...] }
│       ├── createdAt: Timestamp
│       └── status: "analyzed"
│
├── tasks/
│   └── {taskId}/
│       ├── meetingId: {meetingId}
│       ├── title: "Complete the authentication and login page"
│       ├── assignee: "Ayush"
│       ├── deadline: "2026-10-30" (or "Friday")
│       ├── classification: "confirmed" | "suggestion" | "question"
│       ├── priority: "high"
│       ├── status: "todo" | "in_progress" | "done"
│       ├── approvalStatus: "pending" | "approved" | "rejected"
│       ├── conflicts: [
│       │     { type: "ambiguous_deadline", message: "..." }
│       │   ]
│       ├── externalRefs: {
│       │     githubIssueUrl: "https://github.com/org/repo/issues/104",
│       │     trelloCardUrl: "https://trello.com/c/flow-104"
│       │   }
│       └── updatedAt: Timestamp
│
└── audit_logs/
    └── {logId}/
        ├── taskId: {taskId}
        ├── action: "promoted_suggestion" | "approved_task" | "exported_github"
        ├── performedBy: "Ayush (Lead)"
        └── timestamp: Timestamp
```

### Why Firestore:
1. **Real-time Synchronization:** When tasks are approved, real-time listeners update the Kanban board across all team members immediately.
2. **Offline Persistence & Caching:** Allows the dashboard to operate seamlessly with zero latency.
3. **Structured Querying:** Enables filtering tasks by `assignee == "Ayush"`, `approvalStatus == "approved"`, or `classification == "suggestion"`.

---

## 🐙 5. GitHub REST API Integration

Once tasks pass the **Human-in-the-Loop Review Gate**, MeetFlow AI dispatches deliverables directly into the team's GitHub repository.

### API Connection Details:
- **Endpoint:** `POST https://api.github.com/repos/{owner}/{repo}/issues`
- **Authentication:** GitHub Personal Access Token (PAT) via `Authorization: Bearer <TOKEN>` header.
- **Request Payload:**
```json
{
  "title": "Complete the authentication and login page",
  "body": "### Context from Meeting Sync\nLet's finish the login page by Friday.\n\n- **Assignee:** @Ayush\n- **Deadline:** Friday (Oct 30, 2026)\n- **Priority:** HIGH\n- **Classification:** Confirmed Commitment\n- **Estimated Effort:** 6.0 hours\n\n*Created automatically via MeetFlow AI Agent.*",
  "assignees": ["Ayush"],
  "labels": ["frontend", "auth", "meetflow:confirmed", "priority:high"]
}
```
- **Response Handling:** Stores the resulting `html_url` (e.g., `https://github.com/org/repo/issues/104`) in the task's Firestore record for 1-click navigation directly from the dashboard.

---

## 📋 6. External Tool Integrations (Trello, Slack & Jira)

In addition to GitHub, MeetFlow AI supports unified multi-platform task synchronization:

### 1. Trello REST API:
- **Endpoint:** `POST https://api.trello.com/1/cards`
- **Functionality:** Creates cards in target lists (*"Sprint Backlog"*, *"To Do"*), attaches member IDs, and sets calendar due dates (`due: "2026-10-30T17:00:00Z"`).

### 2. Slack / Discord Webhook Notifications:
- **Webhook Endpoint:** `POST https://hooks.slack.com/services/...`
- **Functionality:** Dispatches an executive digest to `#engineering-sprint`:
  > *“📢 3 tasks from Sprint Planning were approved and synchronized to GitHub Issues by Ayush.”*

### 3. Interactive Sandbox Simulator:
- For zero-credential demonstrations, the prototype includes an integrated sandbox dispatcher that simulates live REST API handshakes, generates valid mock payloads, and creates interactive issue preview links without exposing production keys.

---

## 🛡️ 7. Smart Conflict & Duplicate Detection Engine

The prototype does not blindly forward text to project boards. It runs an automated validation layer before presenting tasks for human approval:

1. **Jaccard Token Similarity (>55% Threshold):**
   - Compares candidate tasks against existing backlogs to identify duplicate or overlapping deliverables.
   - Highlights the existing task ID and offers a 1-click *"Merge with existing task"* button.
2. **Ambiguous Assignment Flagging:**
   - Detects unassigned roles like *"team member"*, *"someone"*, or *"anyone"*, prompting the user to select an explicit assignee.
3. **Temporal Ambiguity Detection:**
   - Flags non-specific deadlines like *"soon"*, *"asap"*, or *"later"*, requiring a target due date prior to issue dispatch.
4. **Workload Capacity Balancing:**
   - Alerts if an individual assignee is overloaded with 3+ critical deadlines on the same date.

---

## 🎯 8. Benchmark Example Walkthrough (Slide 9 Specification)

### Transcript Input:
> *“Ayush will complete the login page by Friday. Rahul suggested adding Google login, but the team hasn't finalized it. Ayush will update the API documentation by Monday.”*

### System Execution Results:
1. **Task 1 (Complete login page):**
   - **Classification:** `Confirmed Commitment`
   - **Assignee:** `Ayush` | **Deadline:** `Friday`
   - **Action:** Ready for immediate 1-click batch approval.
2. **Task 2 (Investigate Google login):**
   - **Classification:** `Suggestion / Exploratory Action`
   - **Assignee:** `Rahul` | **Deadline:** `Pending Approval`
   - **Safety Mechanism:** Prevented from automatic issue creation. Held in the **Review Gate** where the lead can deliberately click *"Promote to Task"* or keep it in the idea backlog.
3. **Task 3 (Update API documentation):**
   - **Classification:** `Confirmed Commitment`
   - **Assignee:** `Ayush` | **Deadline:** `Monday`
   - **Action:** Approved and synchronized to GitHub Issues with `#documentation` label.

---

## 💻 9. Deployment Architecture (Vercel Edge)

- **Hosting Platform:** **Vercel** (Global Edge CDN for frontend assets and serverless routing).
- **Environment Security:** `VITE_GEMINI_API_KEY` configured securely via Vercel Project Environment Variables.
- **Fail-Safe Resilience:** Dual-engine architecture—if Google Gemini API experiences external network spikes, the built-in deterministic client NLP parser takes over immediately, guaranteeing **zero crashes and 100% uptime during live hackathon demos**.
- **Interactive Pitch Mode:** Full-screen 10-slide pitch presentation deck accessible directly via the top navigation bar.

---

## 🏁 10. Summary for Judges

| Feature | MeetFlow AI Approach | Traditional Summarizers |
| :--- | :--- | :--- |
| **Output** | Actionable, approved tasks with owners & deadlines | Unstructured paragraphs of meeting notes |
| **Commitment Handling** | Strict separation of confirmed tasks vs suggestions | Mistakenly treats all brainstormed ideas as tasks |
| **Quality Control** | Human-in-the-loop approval & conflict detection | Zero validation; prone to hallucinations |
| **Execution** | Automated live synchronization to GitHub & Trello | Manual copy-pasting required by project manager |
| **Database** | Persistent Firestore state & audit tracking | Ephemeral text output |
