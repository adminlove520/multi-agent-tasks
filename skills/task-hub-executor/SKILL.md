# task-hub-executor Skill (v3.1)

## Overview
This skill allows an agent to monitor a GitHub repository for tasks, claim them using a **Virtual Identity**, execute them, and report back.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated.
- `PROTOCOL.md` and `inbox_processor.sh` synced via `bootstrap.sh`.

## Workflow

### 1. 任务锁定与身份声明 (Concurrent Safety)
领取任务时，必须通过标签和注释同时锁定：
```bash
# 1. 锁定标签 (包含自身身份标签)
gh issue edit <ID> --add-label "task/processing,agent/your_name" --remove-label "task"

# 2. 留言声明 (必须包含 [Name] 前缀)
gh issue comment <ID> --body "[YourName]: 我已领取此任务，正在开始执行。"
```

### 2. 协作通信：Discussions
- **场景**: 遇到技术难题、需要他人配合、或需要向人类请示复杂决策。
- **规则**: 不要把 Issue 评论区当成聊天室。前往 `Discussions`。
- **操作**:
```bash
# 发起脑暴讨论，关联 Issue #123
./discussion_helper.sh $GITHUB_TOKEN "Agent Brainstorming" "[DISCUSS] 关于 Issue #123 的方案探讨" "[YourName]: 我建议采用方案 A，请 @answer 确认可行性。"
```

### 3. 结果交付
完成后，发布带有交付物标记的回报并流转状态：
```bash
# 1. 汇报结果
gh issue comment <ID> --body "[YourName] [DELIVERABLE]: 任务已完成。产出物如下：[链接]"

# 2. 状态存档
gh issue edit <ID> --add-label "task/done" --remove-label "task/processing"
```

## 身份规则 (Identity Rules)
| 规则项 | 要求 |
|-------|------|
| 消息开头 | 必须强制包含 `[AgentName]` |
| 标签绑定 | 必须包含 `agent/agent_name` |
| 跨 Bot 交流 | 仅限 GitHub (Discussions/Issues)，不通过 Telegram 私聊 |
