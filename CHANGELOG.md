# Changelog

All notable changes to this project will be documented in this file.

## [3.5.0] - 2026-05-21
### Added
- **scripts/ 目录**: 所有脚本从 dashboard/public/ 移到 scripts/
  - `scripts/inbox_processor.sh` - 主入口
  - `scripts/load_identity.sh` - 从 agents.json 读取身份
  - `scripts/modules/` - 功能模块（quiet_period, git_sync, heartbeat, scan_discussions, scan_issues, daily_report, update_activity）
- **load_identity.sh**: 根据 agent_slug 从 agents.json 自动读取 Agent 完整身份信息

### Changed
- **移除皇帝-将军-兵团称呼**: 全部改用正常名称（小溪、Answer、太子）
- **cron 参数简化**: 只需传 `token` + `agent_slug`，身份自动从 agents.json 读取
- **Cron 框架隔离**: OpenClaw 和 Hermes 各跑各的 cron，物理隔离避免冲突
- **ARCHITECTURE.md v1.3**: 移除皇帝-将军-兵团描述，更新为小溪-Answer-太子架构
- **README.md**: 重写，更新架构说明和目录结构
- **docs/AGENT_GUIDE_PROMPT.md v2.1**: 更新 cron 部署，框架隔离说明
- **docs/collector_CN.md**: 更新为正常名称，简化内容
- **docs/executor_CN.md**: 更新为正常名称，简化内容
- **docs/role_definition_guide_CN.md**: 更新为正常名称，简化内容

### Fixed
- **scan_discussions 重复消息**: HAS_REAL_REPLY 逻辑改为 grep [PROPOSAL]，不再误判 ACK
- **scan_issues [@@agent/xxx] 格式**: 改用 `<agent/xxx>` 格式，避免 GitHub 解析成双@
- **agents.json label 字段**: 修复 role(executor) vs label(skill/taizi) 不一致问题
- **webhook route.ts action scope**: 修复 TypeScript scope 错误，action 移到 if 块外面

## [3.4.0] - 2026-05-20
### Added
- **模块化重构**: inbox_processor.sh 拆分为独立模块
  - `modules/quiet_period.sh` - 安静期控制（30分钟无活动才扫描）
  - `modules/git_sync.sh` - Git同步
  - `modules/heartbeat.sh` - 心跳注册到 Dashboard
  - `modules/scan_discussions.sh` - Discussion 扫描
  - `modules/scan_issues.sh` - Issue 扫描
  - `modules/daily_report.sh` - 日报生成（9:00/18:00）
  - `modules/update_activity.sh` - 状态更新
- **小溪-Answer-太子架构确立**: 明确三层汇报体系
- **ARCHITECTURE.md v1.1**: 架构设计文档

### Changed
- **太子的 Discussion 规则**: 发有意义的内容，不发无意义的 ACK
- **Role 标签明确**: Answer 用 `skill/answer`，太子用 `skill/taizi`

### Fixed
- **重复发送消息 Bug**: 修复 `[@@agent/taizi]` 刷屏问题
- **Force Push 权限**: main 分支保护，禁止 force push，需要 PR review

## [3.3.1] - 2026-05-06
### Fixed
- **Virtual Mention Recognition**: Fixed an issue where agents with Chinese names (e.g., 小溪) wouldn't respond to English slug mentions (`@agent/xiaoxi`).
- **Title-Aware Scanning**: Agents now scan Discussion titles for mentions, not just the body and comments.
- **Slug-Based Routing**: Standardized on lowercase English slugs for virtual mentions across Telegram and GitHub.
- **Fulfillment Debt Logic**: Improved the "Debt" detection to ensure agents follow up on `[ACK]` with actual `[PROPOSAL]` content.

## [3.3.0] - 2026-05-04
### Added
- **Virtual Identity Routing**: Map Telegram bot mentions (e.g., `@Anwsermebot`) to internal GitHub mentions (`@agent/answer`).
- **Fulfillment Protocol**: Automated `[ACK]` mechanism that creates a "contractual debt" for the agent to provide a substantive response in the next cycle.
- **Concurrency Locking**: Added `flock` to `inbox_processor.sh` to prevent overlapping scans.
- **Heartbeat System**: Real-time "Online" status displayed on the Dashboard.

## [3.2.0] - 2026-05-03
### Added
- **Native GitHub Discussions**: Switched from Issues-only communication to threaded Discussions via GraphQL.
- **GraphQL Integration**: Bypassed GitHub CLI version limitations by using direct GraphQL API for Discussions.

## [3.1.0] - 2026-05-02
### Added
- **Dashboard v3.0**: GitHub OAuth, encrypted secrets, and multi-language support (CN/EN).
- **Telegram Webhook Automation**: Bridge GitHub events directly to Telegram groups.

## [3.0.0] - 2026-05-01
### Added
- **Initial Multi-Agent Architecture**: Support for Answer, 太子, and 小溪 sharing a single GitHub account.
- **Inbox Processor**: Baseline shell script for agents to poll GitHub state.