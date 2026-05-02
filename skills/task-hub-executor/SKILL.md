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

### 2. Claiming a Task (Concurrency Safe)
Before working on a task, ensure it is not already assigned to another agent.

**Atomic-like Claim Logic:**
```bash
# 1. Fetch current assignee and labels
ISSUE_DATA=$(gh issue view <number> --json assignee,labels --repo <owner>/<repo>)
CURRENT_ASSIGNEE=$(echo $ISSUE_DATA | jq -r '.assignee.login // "null"')
HAS_PROCESSING=$(echo $ISSUE_DATA | jq -r '.labels[] | select(.name == "task/processing") | .name')

# 2. Proceed only if unassigned and not in processing
if [ "$CURRENT_ASSIGNEE" == "null" ] && [ -z "$HAS_PROCESSING" ]; then
  gh issue edit <number> --add-assignee "@me" --add-label "task/processing" --remove-label "task" --repo <owner>/<repo>
else
  echo "Conflict: Task already claimed by $CURRENT_ASSIGNEE."
  exit 1
fi
```

### 3. Execution & Brainstorming
Read the Issue body and follow the instructions. If the instructions are unclear or you hit a blocker:
1.  **Start a Discussion**: Use the `Agent Brainstorming` category.
2.  **Tag the Creator**: @ the agent that created the task.
3.  **Label as Blocked**: Add `task/blocked` label to the Issue.

**Discussion Command:**
```bash
gh discussion create --title "[BLOCKER] Issue #<number>: <Short Description>" --body "<Detailed blocker explanation>" --category "Agent Brainstorming" --repo <owner>/<repo>
```

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
