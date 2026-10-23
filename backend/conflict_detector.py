import re
from typing import List
from models import TaskItem, ConflictWarning, ConflictType, ClassificationType, TaskPriority

def normalize_text(text: str) -> set:
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    stop_words = {'the', 'and', 'will', 'with', 'for', 'that', 'this', 'from', 'have', 'need', 'task', 'page'}
    return {w for w in words if w not in stop_words}

def calculate_jaccard_similarity(text1: str, text2: str) -> float:
    tokens1 = normalize_text(text1)
    tokens2 = normalize_text(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def detect_conflicts(tasks: List[TaskItem]) -> List[TaskItem]:
    """
    Analyzes tasks for duplicates, missing owners, ambiguous deadlines,
    and conflicting workloads.
    """
    vague_owners = {"unassigned", "team member", "team", "someone", "anyone", "dev", "engineer", "tbd"}
    vague_deadlines = {"soon", "asap", "later", "eventually", "next week", "tbd", "sometime", "shortly"}

    # Track owner workload
    owner_task_count = {}

    for i, task in enumerate(tasks):
        conflicts: List[ConflictWarning] = []

        # 1. Missing or ambiguous owner
        clean_owner = (task.assignee or "").strip().lower()
        if not clean_owner or clean_owner in vague_owners or "team member" in clean_owner:
            conflicts.append(ConflictWarning(
                conflict_type=ConflictType.MISSING_OWNER,
                message=f"Task '{task.title}' has no specific owner (currently: '{task.assignee}').",
                severity="warning" if task.classification == ClassificationType.CONFIRMED else "info",
                suggested_fix="Assign to a specific team member before moving to GitHub/Trello."
            ))
        else:
            owner_task_count[clean_owner] = owner_task_count.get(clean_owner, 0) + 1

        # 2. Ambiguous or missing deadline for confirmed tasks
        clean_deadline = (task.deadline or "").strip().lower()
        if task.classification == ClassificationType.CONFIRMED:
            if not clean_deadline or clean_deadline in vague_deadlines:
                conflicts.append(ConflictWarning(
                    conflict_type=ConflictType.AMBIGUOUS_DEADLINE,
                    message=f"Deadline '{task.deadline or 'None'}' is ambiguous or missing.",
                    severity="warning",
                    suggested_fix="Specify a concrete date (e.g., Friday, Monday, or YYYY-MM-DD)."
                ))

        # 3. Duplicate detection across other tasks
        for j, other_task in enumerate(tasks):
            if i != j:
                sim = calculate_jaccard_similarity(task.title, other_task.title)
                # Also check description overlap
                desc_sim = calculate_jaccard_similarity(task.description or "", other_task.description or "")
                overall_sim = max(sim, (sim * 0.7 + desc_sim * 0.3))

                if overall_sim >= 0.55:
                    conflicts.append(ConflictWarning(
                        conflict_type=ConflictType.DUPLICATE,
                        message=f"Potential duplicate ({int(overall_sim * 100)}% match) of task '{other_task.title}'.",
                        severity="critical" if overall_sim > 0.8 else "warning",
                        suggested_fix=f"Consider merging with #{other_task.id} or clarifying the scope.",
                        related_task_id=other_task.id
                    ))

        # 4. Check for high workload overload on same assignee
        if clean_owner not in vague_owners and owner_task_count.get(clean_owner, 0) >= 3 and task.priority in [TaskPriority.HIGH, TaskPriority.URGENT]:
            conflicts.append(ConflictWarning(
                conflict_type=ConflictType.RESOURCE_CONFLICT,
                message=f"High workload: {task.assignee} is assigned multiple high-priority deliverables simultaneously.",
                severity="warning",
                suggested_fix="Review capacity and distribute subtasks if necessary."
            ))

        task.conflicts = conflicts

    return tasks
