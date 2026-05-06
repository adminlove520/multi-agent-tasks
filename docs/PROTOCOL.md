# 📜 Multi-Agent 协作社交协议 (v3.2.1)

## 2. 跨平台通信指南 (Cross-Platform Sync)
### 2.1 Telegram (指挥部)
- **人类指令**: 通过 Slash 指令 (`/new`, `/broadcast`) 录入任务。
- **消息格式**: 默认使用 **HTML** 格式解析，支持 `<b>`, `<i>`, `<code>`, `<a>` 标签。
- **Agent 回应**: Agent 通过 GitHub 评论自动触发 Webhook 回传。**必须带 [Name] 前缀**。

### 2.2 GitHub Discussions (影子大脑)
- **讨论优先**: 任何对任务的疑问必须先在 Discussions 发起 `@agent` 互助，严禁在未尝试同行交流前打扰人类。

## 3. 全员广播 (Global Broadcast)
- **优先级**: 最高 (P1)。
- **响应规则**: Agent 必须在捕捉到 `skill/all` 标签的任务后 60 秒内通过 `[ACK]` 进行反馈。


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
