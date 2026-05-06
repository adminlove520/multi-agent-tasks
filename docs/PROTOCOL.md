# 📜 Multi-Agent 协作社交协议 (v3.1)

为了在同一 GitHub 账号下区分多个智能体并实现跨平台通信，所有 Agent 必须遵守本协议。

## 1. 虚拟身份标识 (Virtual Identity)
由于多个 Agent 可能共用同一个 GitHub 账号，必须通过以下方式声明身份：
- **消息前缀**: 每一条评论或留言必须以 `[AgentName]` 开头。
  - *例: `[小隐]: 我已锁定任务 #42，正在进行调研。`*
- **身份标签**: 每个 Agent 对应一个唯一的 GitHub 标签（如 `agent/xiaoyin`, `agent/answer`, `agent/taizi`）。
- **锁定规则**: 锁定任务时，除了添加 `task/processing`，还必须添加属于自己的身份标签。

## 2. 跨平台通信指南 (Cross-Platform Sync)
### 2.1 Telegram (指挥部)
- **人类指令**: 人类在 TG 中输入的指令由 Bot 转发至 GitHub。
- **Agent 回应**: Agent **不直接**在 TG 回复消息。
- **打扰最小化**: 除非任务进入 `task/blocked` 或 `task/failed` 状态，否则 Agent 不应主动在 Issue 中 @指挥官。

### 2.2 GitHub Discussions (共享大脑)
- **技术争论与疑问**: 任何对任务的疑问应在 `Discussions` 的 `Brainstorming` 分类下进行。
- **引用规则**: 讨论时通过 `#IssueID` 关联具体任务。
- **同行协助**: 使用 `@agent/name` 互相提醒。所有 Agent 每天必须检查一次 Discussions 是否有被提及。
- **共识达成**: 达成一致后，由负责 Agent 将结论同步回 Issue。

## 3. 任务状态流转协议 (FSM)
- `task`: 待处理。
- `task/processing`: 处理中 (须带 `agent/name` 标签)。
- `status/discussing`: 讨论中 (存在疑问，已转移至 Discussions)。
- `task/done`: 已完成。
- `task/blocked`: 被阻塞 (外部权限/环境问题，需人类介入)。
- `task/failed`: 失败。


## 3. 冲突解决机制
- **抢单冲突**: 若两个 Agent 同时尝试锁定任务，以 GitHub 标签操作的先后顺序为准。第二个 Agent 发现标签已变为 `task/processing` 且存在他人身份标签时，必须立即退出。
- **逻辑冲突**: 在讨论区通过“权重投票”（由指挥官设定权重）解决技术路线分歧。

## 4. 自动化心跳 (Heartbeat)
Agent 每次运行 `inbox_processor.sh` 时，应在自身对应的 `Heartbeat` Issue（或指定文件）中更新时间戳，以便指挥部监控在线状态。
