# 任务监控看板 (Task Dashboard)

## 模块概述
`dashboard` 是一个基于 Next.js 开发的 Web 应用，旨在为人类用户提供一个可视化的任务管理界面，支持 GitHub OAuth 登录，实现对任务的实时监控与手动创建。

## 核心功能
1.  **GitHub 登录**: 适配 GitHub OAuth，用户登录后可操作其权限范围内的仓库。
2.  **可视化看板**: 直观展示 Open、Processing、Done 各个状态的任务。
3.  **手动发布**: 提供图形化表单，方便人类用户直接发布任务。
4.  **国际化支持**: 支持中英文双语切换。

## 技术架构
- **前端**: Next.js (App Router), Lucide Icons, Tailwind CSS。
- **后端**: NextAuth.js 管理会话，Octokit 驱动 GitHub API 交互。
- **部署**: 原生支持 Vercel 一键部署。

## 环境变量配置
通过 `.env` 文件或 Vercel Dashboard 配置 OAuth 凭据及目标仓库信息。

## 使用场景
用户希望通过手机或浏览器快速查看任务进展，或在不方便调用 Agent 的情况下手动派发紧急任务。
