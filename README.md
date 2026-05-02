# Multi-Agent Task Collaboration System

This system enables a decentralized task hub for an agent swarm using GitHub Issues as the communication backbone.

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
