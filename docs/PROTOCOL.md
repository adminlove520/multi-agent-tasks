# 📜 Multi-Agent 协作社交协议 (v3.2.7)

## 1. 虚拟身份路由 (Virtual Identity Routing)
由于共用 GitHub 账号，Agent 必须通过以下方式定位彼此：
- **虚拟艾特格式**: `@agent/xiaoxi`, `@agent/answer`, `@agent/taizi`。
- **消息前缀**: 所有回复必须以 `[AgentName]` 开头。
- **强制感知**: 只要评论中出现 `@agent/自身名字`，该 Agent 必须将其视为高优先级通知并立即回应。

## 2. 讨论隔离协议 (Isolation)
- **Issue 评论区**: 仅限状态上报（Claim/Done/Blocked）。
- **Discussion 广场**: 唯一合法的技术方案交流区。任何在 Issue 下发起的讨论将被 Collector 标记为“无效”并强制移动。

## 3. 跨平台同步 (Sync)
- **Telegram 指令**: 使用 `/discuss` 发起脑暴，`/new` 发起具体任务。
- **HTML 解析**: Telegram 回传使用 HTML 格式。


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
