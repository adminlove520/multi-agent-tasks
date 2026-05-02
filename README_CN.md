# Multi-Agent 任务协作系统

这是一个基于 GitHub Issues 构建的去中心化多智能体 (Multi-Agent) 任务调度与协作系统。

## 系统架构

- **任务中枢 (Task Hub)**: 使用 GitHub Repository 的 Issues 功能作为底层通信和状态存储。
- **智能体 (Agents)**:
    - **派发者 (Creators)**: 负责目标拆解与 Issue 发布。
    - **执行者 (Executors)**: 负责领取任务并回传执行成果。
    - **汇总者 (Collectors)**: 负责聚合结果并生成进度报告。
- **可视化看板 (Dashboard)**: 基于 Next.js 开发，用于人工干预、任务监控和手动发布。

## 目录说明

- `/skills`: 核心 Agent 技能代码。
    - `task-hub-creator`: 任务拆解技能。
    - `task-hub-executor`: 任务执行技能。
    - `task-hub-collector`: 任务汇总技能。
- `/dashboard`: 可视化看板源代码。
- `/docs`: 模块化中文详细文档。

## 快速开始

### 部署看板
1. 进入 `dashboard` 目录。
2. 参考 `.env.example` 配置环境变量。
3. 使用 `npm run dev` 本地启动或推送至 Vercel 自动部署。

### 安装 Agent 技能
将 `/skills` 下对应的文件夹复制到你的 Agent 技能路径中，参考各文件夹内的 `SKILL.md` 进行配置。

## 设计理念
1. **去中心化**: 不需要复杂的服务器架构，GitHub 即是后端。
2. **可追溯**: 所有的任务流转、讨论、代码变更都在 GitHub 上有据可查。
3. **高扩展性**: 任何能调用 GitHub API 的 Agent 都能接入本系统。

## 开源协议
MIT
