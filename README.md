# 🚀 MeetFlow AI — Meeting-to-Execution Automation Agent

> **Turn Every Meeting into Action.**  
> Built for the **HACKNOVA’26** Final Round Hackathon.

---

## 📌 Executive Summary

**MeetFlow AI** is an intelligent meeting-to-execution automation platform that transforms conversational meeting discussions into structured, human-approved, and trackable project tasks for **GitHub Issues** and **Trello**.

Unlike simple meeting summarizers that generate passive text notes, **MeetFlow AI executes workflows**:
1. **Separates Commitments from Suggestions**: Confirmed action items are assigned with explicit deadlines, while brainstormed ideas (e.g., *"Rahul suggested adding Google login, but not finalized"*) are flagged as **Exploratory Suggestions** requiring human approval before accidental sprint assignment.
2. **Detects Duplicates & Conflicts**: Flags duplicate deliverables using token overlap and highlights ambiguous owners or vague deadlines.
3. **Human-in-the-Loop Approval Gate**: Allows project managers to review, promote suggestions, edit estimates, and batch-approve tasks in one click.
4. **Automated Task Execution**: Dispatches approved deliverables directly into GitHub Issues and Trello Cards with real API credentials or a zero-configuration sandbox simulator.
5. **Interactive Pitch Deck**: Built directly into the application with an interactive 10-slide presentation mode matching the official hackathon pitch specifications.

---

## 🎯 Benchmark Example (Slide 9 Specification)

### Input Discussion:
> *“Ayush will complete the login page by Friday. Rahul suggested adding Google login, but the team hasn't finalized it. Ayush will update the API documentation by Monday.”*

### AI-Extracted & Classified Output:

| Deliverable Action | Owner | Deadline | Classification | Pipeline State |
| :--- | :--- | :--- | :--- | :--- |
| **Complete the login page** | **Ayush** | **Friday** | 🟢 **Confirmed Commitment** | Ready for 1-Click Approval |
| **Investigate Google login** | **Rahul** | **Pending Approval** | 🟡 **Suggested / Exploratory** | Gatekeeper Hold (Prevented from auto-assignment) |
| **Update API documentation** | **Ayush** | **Monday** | 🟢 **Confirmed Commitment** | Ready for 1-Click Approval |

---

## 🏗️ System Architecture & 8-Step Pipeline

```
[Meeting Input] ──► [Text Cleaning & Segmentation] ──► [AI Information Extraction]
                                                               │
                                                               ▼
[GitHub / Trello Execution] ◄── [Human Review & Approval] ◄── [Commitment Classification & Conflict Checks]
         │
         ▼
[Progress & Kanban Tracker]
```

### 5-Layer Design:
1. **Frontend Layer**: React 19 + TypeScript + Vite with custom glassmorphic dark theme, live voice/microphone dictation, interactive review triage, Kanban board, and full-screen pitch deck.
2. **Backend Layer**: Python FastAPI high-performance asynchronous REST API with Pydantic schemas and CORS support.
3. **AI & Intelligence Layer**: Dual-mode engine:
   - **Built-in High-Accuracy Semantic NLP Engine**: Works 100% offline out-of-the-box with zero tokens/API keys needed.
   - **Cloud LLM API Integration**: Optional Google Gemini (1.5 Flash/Pro) and OpenAI (GPT-4o) via user-configurable settings.
4. **Data & State Layer**: In-memory repository with SQLite/PostgreSQL schema readiness, audit logging, and conflict tracking.
5. **Integration Layer**: GitHub REST API (issues, milestones, labels) and Trello REST API (cards, boards, checklists), coupled with an interactive Sandbox Simulator.

---

## ✨ Key Features

- 🎙️ **Meeting Input Studio**: Paste meeting notes, upload transcript files (`.txt`, `.vtt`, `.srt`, `.json`, `.docx`), or dictate live speech via Web Speech API with audio waveforms.
- ⚡ **One-Click Benchmark Transcripts**: Preloaded with 3 scenarios:
  1. *HACKNOVA Pitch Benchmark (Slide 9 Example)*
  2. *Sprint 14 Planning & Conflict Detection (Duplicate tasks & ambiguous owners)*
  3. *Mobile App & UX Redesign Sync (Feature debate & analytics ownership)*
- ⚖️ **Human-in-the-Loop Review Center**: Filter by Confirmed, Suggestions, Decisions Needed, or Conflicts. Includes 1-click **Promote Suggestion to Task**, inline editor, and **Batch Approve All Confirmed** with celebratory confetti.
- 🔍 **Conflict & Duplicate Detector**: Identifies overlapping deliverables (>55% similarity score), flags vague deadlines (e.g. *"soon"*, *"asap"*), and highlights unassigned roles.
- 🚀 **Execution Hub**: Select approved tasks and dispatch to GitHub Issues or Trello Cards with full payload inspection.
- 📊 **Kanban & Progress Tracker**: Drag-and-drop Kanban lanes (*Backlog/Suggestions*, *To Do*, *In Progress*, *In Review*, *Done*), workload capacity distribution, and time-saved ROI metrics.
- 🎯 **Presentation Mode**: Fullscreen 10-slide HACKNOVA'26 pitch presentation viewer with keyboard arrows and live demo triggers.

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Modern CSS (Glassmorphism, CSS Custom Properties), Lucide Icons, Canvas Confetti.
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic, HTTPX.
- **AI Engine**: Contextual Semantic Extraction + Optional Cloud LLM (Gemini / OpenAI).
- **Integrations**: GitHub REST API v3, Trello REST API, Sandbox Dispatcher.

---

## 🚀 Quickstart Guide

### Option 1: 1-Click Launch (Windows)
Double-click `run.bat` in the project root. This will:
1. Start the FastAPI backend on `http://127.0.0.1:8000`
2. Start the Vite React frontend on `http://localhost:5173`
3. Automatically launch your default browser to `http://localhost:5173`

### Option 2: Manual Terminal Execution

#### 1. Start Backend:
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API docs available at: `http://127.0.0.1:8000/docs`

#### 2. Start Frontend:
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Verification & Testing

Both servers have been tested and verified:
- `python -c "import main; print('Backend loaded!')"` -> **OK**
- `npm run build` -> **Build passed (0 errors)**
- Live API response test -> **HTTP 200 on all endpoints**

---

## 👥 Hackathon Team Information

- **Project:** MeetFlow AI
- **Problem Statement:** Meeting-to-Execution Automation Agent
- **Event:** HACKNOVA’26 Final Round
- **Tagline:** *Turn Every Meeting into Action.*
