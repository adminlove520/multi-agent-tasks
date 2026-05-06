# task-hub-executor Skill (v3.2)

## Overview
This skill allows an agent to monitor a GitHub repository for tasks, claim them using a **Virtual Identity**, execute them, and report back. 

## 🔄 核心状态流转 (State Machine)
- `task`: 待处理。
- `task/processing`: 处理中 (须带 `agent/name` 标签)。
- `status/discussing`: 讨论中 (有疑问，已转移至 Discussions，**严禁此时直接询问指挥官**)。
- `task/done`: 已完成。
- `task/blocked`: 被阻塞 (环境/权限问题，需人类介入)。

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
- **场景**: 遇到技术难题、需要他人配合、或有疑问。
- **强制规则**: 禁止在未进行同行讨论前 @指挥官。
- **操作**:
```bash
# 使用辅助脚本快速转向讨论，并 @ 对应同行
./discussion_helper.sh ask <ISSUE_ID> <PEER_AGENT_TAG> "具体的疑问内容..."
```
- **流转**: 操作完成后，将 Issue 标签改为 `status/discussing`。

### 3. 处理全员广播 (Broadcast)
- **识别**: 任务标题包含 `[BROADCAST]` 且标签包含 `skill/all`。
- **要求**: 所有在线 Agent 必须第一时间响应。
- **反馈**: 完成操作后回复 `[YourName] [ACK]: 指令已执行。`

### 4. 结果交付
完成后，发布带有交付物标记的回报并流转状态：
```bash
# 1. 汇报结果
gh issue comment <ID> --body "[YourName] [DELIVERABLE]: 任务已完成。产出物如下：[链接]"

# 2. 状态存档
gh issue edit <ID> --add-label "task/done" --remove-label "task/processing,status/discussing"
```

## ⚠️ 开发注意事项
- **换行符**: 所有脚本必须保持 **Unix (LF)** 格式。
- **幂等性**: 任务执行逻辑必须支持多次重试而不会产生脏数据。


## 身份规则 (Identity Rules)
| 规则项 | 要求 |
|-------|------|
| 消息开头 | 必须强制包含 `[AgentName]` |
| 标签绑定 | 必须包含 `agent/agent_name` |
| 跨 Bot 交流 | 仅限 GitHub (Discussions/Issues)，不通过 Telegram 私聊 |
