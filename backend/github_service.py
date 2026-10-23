"""
MeetFlow AI — GitHub Integration Service
Handles all GitHub REST API interactions server-side.
Secrets (tokens) never leave the backend.
"""
import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from models import TaskItem, ExportRequest

logger = logging.getLogger("meetflow.github")

GITHUB_API_BASE = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"
USER_AGENT = "MeetFlow-AI-Agent/1.0 (HACKNOVA26)"

# In-memory publication registry: prevents duplicate issue creation
# Structure: { (task_id, owner, repo): { issue_number, issue_url, created_at } }
_PUBLICATION_REGISTRY: Dict[str, Dict[str, Any]] = {}


def _make_headers(token: Optional[str]) -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": USER_AGENT,
    }
    if token and token.strip():
        clean = token.strip()
        if not clean.startswith("Bearer ") and not clean.startswith("token "):
            clean = f"Bearer {clean}"
        headers["Authorization"] = clean
    return headers


def _registry_key(task_id: str, owner: str, repo: str) -> str:
    return f"{task_id}::{owner}/{repo}"


def _build_issue_body(task: TaskItem, meeting_title: Optional[str] = None) -> str:
    lines = [
        f"## 📋 Task: {task.title}",
        "",
        f"> **Source**: Extracted by MeetFlow AI from meeting: _{meeting_title or 'Sprint Sync'}_",
        "",
        "---",
        "",
        "### Description",
        task.description or "_No additional description provided._",
        "",
        "### Details",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| 👤 **Assignee** | {task.assignee or 'Unassigned'} |",
        f"| 📅 **Deadline** | {task.deadline or 'TBD'} |",
        f"| 🔥 **Priority** | {(task.priority or 'medium').upper()} |",
        f"| 🏷️ **Classification** | {task.classification or 'confirmed'} |",
        f"| ⏱️ **Estimated Effort** | {task.estimated_hours or 'N/A'}h |",
        f"| 🎯 **Confidence Score** | {int((task.confidence or 0.95) * 100)}% |",
    ]

    if task.source_quote:
        lines += [
            "",
            "### Original Transcript Excerpt",
            f'> "{task.source_quote}"',
        ]

    if task.tags:
        lines += [
            "",
            "### Labels",
            " ".join(f"`{t}`" for t in task.tags),
        ]

    lines += [
        "",
        "---",
        "",
        "*🤖 Created automatically by [MeetFlow AI](https://github.com/scriptbyayush/hacknova) — Meeting-to-Execution Automation Agent | HACKNOVA'26*",
    ]
    return "\n".join(lines)


async def verify_repository(
    owner: str, repo: str, token: Optional[str] = None
) -> Dict[str, Any]:
    """Verify a GitHub repository is accessible with the given token."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(url, headers=_make_headers(token))
        if res.status_code == 200:
            data = res.json()
            return {
                "success": True,
                "status": "connected",
                "repo": data.get("full_name"),
                "private": data.get("private", False),
                "open_issues": data.get("open_issues_count", 0),
                "description": data.get("description"),
                "default_branch": data.get("default_branch"),
                "has_issues": data.get("has_issues", True),
                "message": f"Connected to {data.get('full_name')} ({'Private' if data.get('private') else 'Public'}, {data.get('open_issues_count', 0)} open issues)",
            }
        elif res.status_code == 401:
            return {"success": False, "status": "auth_failed", "message": "GitHub token is invalid or expired. Check your Personal Access Token."}
        elif res.status_code == 403:
            return {"success": False, "status": "forbidden", "message": "Insufficient permissions. Token may lack 'repo' scope."}
        elif res.status_code == 404:
            return {"success": False, "status": "not_found", "message": f"Repository '{owner}/{repo}' not found or token lacks read access."}
        else:
            return {"success": False, "status": "error", "message": f"GitHub API returned HTTP {res.status_code}."}
    except httpx.TimeoutException:
        return {"success": False, "status": "timeout", "message": "GitHub API timed out. Check your network connection."}
    except Exception as e:
        return {"success": False, "status": "network_error", "message": f"Network error: {str(e)[:80]}"}


async def create_issue(
    task: TaskItem,
    owner: str,
    repo: str,
    token: str,
    meeting_title: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a single GitHub issue for a task.
    Returns structured result with issue_number, html_url, and status.
    Implements duplicate-publication protection via in-memory registry.
    """
    reg_key = _registry_key(task.id, owner, repo)

    # Duplicate protection: if already published to this repo, return existing record
    if reg_key in _PUBLICATION_REGISTRY:
        existing = _PUBLICATION_REGISTRY[reg_key]
        logger.warning(f"[DUP_GUARD] Task {task.id} already published as #{existing['issue_number']} in {owner}/{repo}")
        return {
            "task_id": task.id,
            "title": task.title,
            "status": "already_published",
            "duplicate_prevented": True,
            "issue_number": existing["issue_number"],
            "external_url": existing["issue_url"],
            "repo": f"{owner}/{repo}",
            "message": f"Issue #{existing['issue_number']} already exists in {owner}/{repo}. Duplicate creation prevented.",
        }

    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues"
    body = _build_issue_body(task, meeting_title)

    labels = list(set([
        f"priority:{task.priority or 'medium'}",
        f"meetflow:{task.classification or 'confirmed'}",
    ] + [t for t in (task.tags or []) if t and len(t) <= 50]))

    payload = {
        "title": task.title,
        "body": body,
        "labels": labels,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, json=payload, headers=_make_headers(token))

        if res.status_code in (200, 201):
            data = res.json()
            issue_url = data.get("html_url", "")
            issue_num = data.get("number", 0)

            # Record in registry to prevent duplicates
            _PUBLICATION_REGISTRY[reg_key] = {
                "issue_number": issue_num,
                "issue_url": issue_url,
                "task_title": task.title,
            }

            # Update task with real URL
            task.github_issue_url = issue_url

            logger.info(f"[GITHUB] Created issue #{issue_num} for task {task.id}: {issue_url}")
            return {
                "task_id": task.id,
                "title": task.title,
                "status": "success",
                "mode": "live_github_api",
                "issue_number": issue_num,
                "external_url": issue_url,
                "repo": f"{owner}/{repo}",
                "payload_dispatched": {k: v for k, v in payload.items() if k != "body"},
            }

        elif res.status_code == 401:
            return _error_result(task, owner, repo, "auth_failed", "GitHub token is invalid or expired (401).", payload)
        elif res.status_code == 403:
            rate = res.headers.get("X-RateLimit-Remaining", "?")
            return _error_result(task, owner, repo, "forbidden", f"Insufficient permissions or rate limit hit (403). Remaining: {rate}", payload)
        elif res.status_code == 404:
            return _error_result(task, owner, repo, "not_found", f"Repository {owner}/{repo} not found (404).", payload)
        elif res.status_code == 422:
            err = res.json().get("message", "Validation error")
            return _error_result(task, owner, repo, "validation_error", f"GitHub rejected the request (422): {err}", payload)
        else:
            return _error_result(task, owner, repo, "api_error", f"GitHub API returned HTTP {res.status_code}: {res.text[:120]}", payload)

    except httpx.TimeoutException:
        return _error_result(task, owner, repo, "timeout", "Request to GitHub timed out. The issue may or may not have been created.", payload)
    except Exception as e:
        return _error_result(task, owner, repo, "network_error", f"Network error: {str(e)[:80]}", payload)


def _error_result(task: TaskItem, owner: str, repo: str, status: str, message: str, payload: dict) -> Dict[str, Any]:
    logger.error(f"[GITHUB] Failed to create issue for task {task.id}: {message}")
    return {
        "task_id": task.id,
        "title": task.title,
        "status": status,
        "mode": "failed",
        "error": message,
        "external_url": None,
        "repo": f"{owner}/{repo}",
        "payload_dispatched": {k: v for k, v in payload.items() if k != "body"},
    }


def get_publication_registry() -> Dict[str, Dict[str, Any]]:
    """Return the current publication registry for audit logs."""
    return dict(_PUBLICATION_REGISTRY)


def clear_registry_for_task(task_id: str, owner: str, repo: str) -> bool:
    """Remove a registry entry (for retry after confirmed failure)."""
    key = _registry_key(task_id, owner, repo)
    if key in _PUBLICATION_REGISTRY:
        del _PUBLICATION_REGISTRY[key]
        return True
    return False
