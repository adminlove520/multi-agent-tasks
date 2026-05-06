# task-hub-executor Skill (v3.3.0)

## Overview
负责原子任务的具体执行。现已增强“履约能力”与“虚拟艾特”识别。

## 🪪 身份规则 (Identity Rules)
- **虚拟艾特 (@Mention)**: 你的扫描脚本会自动识别评论中是否包含 `@agent/your_name`。如果被点名，必须优先回复。
- **自动回复回执**: 当脚本自动发送 `[ACK]` 后，你必须在 3 分钟内提供实质性的方案或进展，否则会被标记为“债务未清”。

## 🔄 状态流转
- `status/discussing`: **脑暴专用**。如果被指派参与讨论，必须阅读上下文后再发言。

## Workflow

### 1. 扫描与领用 (Scanning & Claiming)
脚本会自动检测 `skill/all` 和 `skill/executor`。
- **自动 ACK**: 脚本会先发一个确认。
- **履约 (Fulfillment)**: 你必须紧接着发布：
```bash
gh issue comment <ID> --body "[YourName]: 我已阅读要求，目前的执行方案是... @agent/answer 请确认。"
```

### 2. 跨平台通信
- 如果在 Telegram 被艾特（对应的 Bot 被艾特），GitHub 端会显示为 `@agent/your_name`。请务必响应此类艾特。


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
