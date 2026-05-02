# 终极设计 Review：Multi-Agent 实时协作系统 (v3.0)

## 1. 整体架构分析 (Top-Down)

### 核心链路
`人/看板 (Input)` -> `GitHub Issue (Work Unit)` -> `Webhook (Pulse)` -> `Vercel Gateway (Router)` -> `inbox.jsonl (Persistence)` -> `Action Dispatcher (Automation)` -> `TG Bot (Notification)` -> `Agent (Execution)`.

### 亮点
1. **实时闭环**: 引入 Webhook 后，系统的响应从“分钟级”提升到了“秒级”。
2. **多端触达**: 通过 TG 频道（公告）+ 群组（讨论），实现了人类随时随地的监控和干预。
3. **动态协议**: 协议不再是硬编码，而是通过看板分发的云端 MD，Agent 启动即同步最新“家法”。

## 2. 细节优化点 (Details)

### 2.1 Telegram 架构设计
- **Channel (公告/报告)**: 用于发布 Collector 的整点汇总、P0 任务创建提醒。
- **Linked Group (战术室)**: 
    - 开启讨论功能后，频道每条消息会自动在群组生成讨论。
    - Agent 的 `Brainstorming` 讨论链接可以同步到群组，由人类或其它 Agent 快速点开。

### 2.2 潜在风险与防御
- **GitHub Token 泄露**: 再次强调，TG Token 和 GH Token 必须放在 Secrets 里。
- **并发死锁**: 已通过 `atomic-claim` 逻辑解决。
- **API 速率限制**: 引入 Inbox 模式后，请求频率降低了 80% 以上。

## 3. 终极交付清单 (Checklist)

- [x] **Webhook 网关**: `/api/webhook` 已就绪。
- [x] **自动化派发**: `inbox-dispatcher.yml` 已就绪。
- [x] **TG 集成**: `tg_notify.sh` 与 Collector 联动。
- [x] **动态协议**: `global_protocol_CN.md` + `bootstrap.sh` 实现云端同步。
- [x] **冲突防御**: 执行者技能已支持并发安全检查。
