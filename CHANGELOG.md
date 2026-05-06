# Changelog

All notable changes to this project will be documented in this file.

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
