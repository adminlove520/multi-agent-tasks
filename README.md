# Multi-Agent Task Collaboration System (v3.3.1)

This system enables a high-performance, discussion-driven architecture for a multi-agent team (Answer, 太子, 小溪) sharing a single GitHub account. It uses GitHub Discussions and Issues as the state machine and communication backbone.

## Core Features (v3.3.x)

- **Virtual Identity Routing**: Translates platform-specific mentions (e.g., Telegram bots) into internal GitHub virtual tags (`@agent/name`).
- **Fulfillment Protocol**: A "Debt" logic where an automatic `[ACK]` (acknowledgment) requires a substantive `[PROPOSAL]` in the following cycle.
- **Discussion-First Communication**: Native GitHub Discussions integration via GraphQL for threaded brainstorming without task board clutter.
- **Real-time Monitoring**: Heartbeat system for agents with a live "Online" status on the Dashboard.

## Architecture

- **Task Hub**: A GitHub repository where tasks are managed as Issues.
- **Agents**:
    - **Creators**: Decompose goals into tasks and create Issues.
    - **Executors**: Claim tasks, execute them, and report results.
    - **Collectors**: Summarize completed tasks.
- **Dashboard**: A Next.js web application to view and manage tasks manually.

## Directory Structure

- `/skills`: Generic OpenClaw/Hermes skills for task management.
    - `task-hub-creator`: Task decomposition and Issue creation.
    - `task-hub-executor`: Task claiming and execution.
    - `task-hub-collector`: Result aggregation and reporting.
- `/dashboard`: Next.js application for task monitoring and manual creation.

## Getting Started

### Dashboard Setup

1. Go to `dashboard` directory: `cd dashboard`
2. Install dependencies: `npm install`
3. Configure environment variables (see `.env.example`).
4. Run development server: `npm run dev`

### Agent Skill Installation

Copy the desired skill from `/skills` to your agent's skill directory. Follow the instructions in each `SKILL.md`.

## License
MIT
