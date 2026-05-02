# task-hub-executor Skill

## Overview
This skill allows an agent to monitor a GitHub repository for tasks, claim them, execute them, and report back the results.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated.

## Workflow

### 1. 任务前置：知识检索 (参考 openclaw-qa)
在开始任务前，先检索讨论区是否有相关经验。

**命令:**
```bash
./discussion_helper.sh search "<关键词>"
```

### 2. 任务领取 (并发安全检查)
... (保留原有逻辑) ...

### 3. 沟通闭环：Discussions 协作
如果遇到阻碍或需要技术探讨：
1. **不要**在 Issue 下进行长对话。
2. **发起讨论**: 关联 Issue 编号。

**命令:**
```bash
# 关联 #123 任务发起 Q&A 讨论
./discussion_helper.sh post "Q&A" "[BLOCKER] 关于 Issue #123 的环境问题" "我们在执行任务 #123 时遇到了 X 错误，请 @commander 确认权限。"
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
