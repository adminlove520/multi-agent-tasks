# task-hub-collector Skill

## Overview
This skill allows an agent to aggregate results from completed tasks in the GitHub task hub and provide a comprehensive report to the human coordinator.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated.

## Workflow

### 1. Scanning Completed Tasks
Search for issues with the `task/done` label that have been closed recently.

**Command:**
```bash
gh issue list --label "task/done" --state closed --repo <owner>/<repo>
```

### 2. Aggregating Results
For each closed task:
1. Read the Issue body to understand the original requirement.
2. Read the comments (especially the one from the executor) to get the results.
3. Extract key deliverables and outcomes.

**Read Commands:**
```bash
gh issue view <number> --repo <owner>/<repo>
gh issue view <number> --comments --repo <owner>/<repo>
```

### 3. Reporting
Synthesize the findings into a high-level summary.

**Report Format:**
```markdown
# Task Hub Progress Report
**Report Date**: <Current Date>

## Completed Tasks
### [TASK] <Title>
- **Executor**: <Name>
- **Outcome**: <Short summary>
- **Link**: <Issue URL>

## Overall Status
- Total Tasks Completed: <Count>
- Outstanding/Blocked Tasks: <Count>
```

### 4. Optional: Archive
You may add an `archived` label to processed issues to avoid redundant reporting in the next cycle.
