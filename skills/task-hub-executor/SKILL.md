# task-hub-executor Skill

## Overview
This skill allows an agent to monitor a GitHub repository for tasks, claim them, execute them, and report back the results.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated.

## Workflow

### 1. Polling for Tasks
Scan for open issues with the `task` label and your specific skill label.

**Command:**
```bash
gh issue list --label "task,skill/<my-skill-name>" --state open --repo <owner>/<repo>
```

### 2. Claiming a Task
Choose a task and assign it to yourself. Add the `task/processing` label and remove the `task` label.

**Command:**
```bash
gh issue edit <number> --add-assignee "@me" --add-label "task/processing" --remove-label "task" --repo <owner>/<repo>
```

### 3. Execution
Read the Issue body and follow the instructions. Perform the necessary work (research, coding, analysis, etc.).

### 4. Reporting Results
Once finished, post a comment with the execution summary and close the issue. Add the `task/done` label and remove `task/processing`.

**Comment Format:**
```markdown
## Execution Result
**Executor**: <My Name/Identity>
**Status**: Completed Successfully

## Summary
<Detailed summary of what was done>

## Deliverables
- [Link to file/commit/etc.]
```

**Commands:**
```bash
gh issue comment <number> --body "<Comment Content>" --repo <owner>/<repo>
gh issue edit <number> --add-label "task/done" --remove-label "task/processing" --repo <owner>/<repo>
gh issue close <number> --repo <owner>/<repo>
```

## Status Labels
| Label | Meaning |
|-------|---------|
| task/processing | Task is currently being worked on |
| task/done | Task has been completed |
| task/blocked | Task is blocked (explain in comment) |
