# Changelog

All notable changes to this project will be documented in this file.

## [3.4.0] - 2026-05-20
### Added
- **模块化重构**: inbox_processor.sh 拆分为独立模块
  - `modules/quiet_period.sh` - 安静期控制
  - `modules/git_sync.sh` - Git同步
  - `modules/heartbeat.sh` - 心跳注册
  - `modules/scan_discussions.sh` - Discussion扫描
  - `modules/scan_issues.sh` - Issue扫描
  - `modules/daily_report.sh` - 日报生成（9:00/18:00）
  - `modules/update_activity.sh` - 状态更新
- **皇帝-将军-兵团架构确立**: 明确三层汇报体系
- **ARCHITECTURE.md**: 架构设计文档 v1.1
- **Cron 架构调整**: Linux cron 只唤醒，脚本内部控制频率

### Changed
- **太子的 Discussion 规则**: 发有意义的内容，不发无意义的 ACK
- **Role 标签明确**: Answer 用 `skill/answer`，太子用 `skill/taizi`
- **README 重写**: 添加架构说明和目录结构

### Fixed
- **重复发送消息 Bug**: 修复 `[@@agent/taizi]` 刷屏问题
- **Force Push 权限**: main 分支保护，禁止 force push

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
