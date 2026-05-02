# task-hub-creator Skill

## Overview
This skill allows an agent to decompose a high-level goal into actionable tasks and dispatch them as GitHub Issues to a task hub repository.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated.
- Repository set up as the task hub.

## Workflow

### 1. Task Decomposition
When receiving a complex request, break it down into independent, actionable sub-tasks. Each sub-task should have:
- A clear title.
- Detailed instructions.
- A priority (P0, P1, P2).
- An intended executor label (e.g., `skill/answer`, `skill/taizi`).

### 2. Issue Creation
For each sub-task, create a GitHub Issue using the standard format.

**Command Template:**
```bash
gh issue create --title "[TASK] <Title>" --body "<Body Content>" --label "task,priority/<pX>,skill/<executor>" --repo <owner>/<repo>
```

**Body Format:**
```markdown
## Task Details
**Source**: <Agent Name/Identity>
**Created**: <Timestamp>
**Priority**: <P0|P1|P2>

## Instructions
<Detailed step-by-step instructions for the executor>

## Context
<Any necessary background information, links, or file references>

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### 3. Confirmation
Report the created Issue URLs to the user or the main coordinator.

### 4. Agent Brainstorming (Discussions)
If a task is too vague or requires multi-agent consensus, initiate a GitHub Discussion instead of an Issue.

**Command:**
```bash
gh discussion create --title "[BRAINSTORM] <Topic>" --body "<Context>" --category "Agent Brainstorming" --repo <owner>/<repo>
```

## Label Schema
| Label | Meaning |
|-------|---------|
| task | New task awaiting processing |
| priority/p0 | Critical/Urgent |
| priority/p1 | High priority |
| priority/p2 | Normal priority |
| skill/<name> | Targeted executor skill/agent |
