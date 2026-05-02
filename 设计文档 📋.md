设计文档 📋

───

Multi-Agent 任务协作系统设计

一、架构概览

┌─────────────────────────────────────────────────────────┐
│                      哥哥 (人类)                         │
│                    @风 (5646034524)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    小溪 (主调度)                         │
│  OpenClaw │ @caddycherrybot │ @adminlove520            │
│  角色：指挥官 — 任务拆解、派发、汇总、汇报                 │
└─────────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      Answer (预处理)     │   │       太子 (执行者)      │
│  OpenClaw/Hermes │ Bot  │   │  Hermes │ Bot │ @???    │
│  角色：接收简单任务       │   │  角色：复杂任务深度执行   │
│  预处理/分类/直接处理     │   │  学习/研究/数据分析      │
└─────────────────────────┘   └─────────────────────────┘

二、Agent 分工

| Agent  | 运行时      | GitHub 账号            | 主要职责               |
| ------ | -------- | -------------------- | ------------------ |
| 小溪     | OpenClaw | @adminlove520        | 主调度、任务拆解、结果汇总、汇报哥哥 |
| Answer | Hermes   | @EastSword (待创建)     | 简单任务预处理、分类、直接执行    |
| 太子     | Hermes   | @??? (待创建)           | 复杂任务深度执行、学习研究      |
| 小敏     | OpenClaw | @yankel-121160-coder | (其他任务)             |

三、通信机制：GitHub Issues API

核心设计原则

• 去中心化：通过 GitHub Issues 作为消息中枢，不需要直连
• API 优先：所有 Agent 通过 GitHub API 读写 Issues
• 可追溯：每个操作都有 GitHub 日志

消息格式

{
  "title": "[TASK] 任务简短描述",
  "body": "## 任务详情\n**来源**: 小溪\n**创建时间**: 2026-05-02T19:00:00\n**优先级**: P1\n\n## 执行指令\n\n## 上下文\n\n## 完成标准",
  "labels": ["task", "priority-high"],
  "assignee": "太子GitHub用户名"
}

Label 规范

| Label           | 含义        |
| --------------- | --------- |
| task            | 新任务       |
| task/processing | 执行中       |
| task/done       | 已完成       |
| task/blocked    | 被阻塞       |
| priority/p0     | 紧急        |
| priority/p1     | 高优先级      |
| skill/answer    | Answer 负责 |
| skill/taizi     | 太子负责      |

四、工作流程

4.1 任务派发流程

1. 哥哥给小溪下达任务
       ↓
2. 小溪拆解任务 → 创建 Issue
       ↓
3. 根据任务类型分配：
   - 简单任务 → Label: skill/answer → Answer 领取
   - 复杂任务 → Label: skill/taizi → 太子领取
       ↓
4. 执行者执行 → 评论结果到 Issue → 关闭 Issue
       ↓
5. 小溪定期扫描 Closed Issues → 汇总结果 → 汇报哥哥

4.2 时序图

哥哥     小溪      Answer/太子     GitHub
 │        │            │            │
 │  下达任务  │            │            │
 │──────────>│            │            │
 │        │ 创建Issue   │            │
 │        │───────────> │            │
 │        │            │            │
 │        │  assign自己 │            │
 │        │<───────────│            │
 │        │            │ 扫描领任务   │
 │        │            │<───────────│
 │        │            │            │
 │        │            │ 执行任务     │
 │        │            │             │
 │        │            │ 评论结果     │
 │        │            │───────────> │
 │        │            │             │
 │        │ 扫描Closed  │            │
 │        │<─────────── │            │
 │        │            │            │
 │  汇总汇报 │            │            │
 │<──────────│            │            │

五、Skill 设计

5.1 Skill 列表

| Skill              | 安装方       | 功能                 |
| ------------------ | --------- | ------------------ |
| task-hub-creator   | 小溪        | 创建任务 Issue、拆解指令、派发 |
| task-hub-executor  | Answer/太子 | 领取任务、执行、回报结果       |
| task-hub-collector | 小溪        | 扫描已关闭 Issue、汇总结果   |

5.2 task-hub-creator Skill

# task-hub-creator Skill

## 功能
帮助 Agent 将任务转换为 GitHub Issues 并派发

## 核心流程
1. 接收任务描述
2. 判断任务类型（简单/复杂）
3. 生成标准化的 Issue 内容
4. 调用 GitHub API 创建 Issue
5. 添加适当的 Label 和 Assignee

## API 调用
POST /repos/{owner}/{repo}/issues

## 配置
- GITHUB_TOKEN: GitHub 访问令牌
- REPO_OWNER: 仓库所有者
- REPO_NAME: 仓库名
- DEFAULT_ASSIGNEE: 默认执行者

5.3 task-hub-executor Skill

# task-hub-executor Skill

## 功能
帮助 Agent 从 GitHub Issues 领取任务并执行
## 核心流程
1. 定时扫描 Open Issues（过滤自己的 Label）
2. 领取任务（assign 自己）
3. 执行任务
4. 评论执行结果
5. 关闭 Issue

## API 调用
GET /repos/{owner}/{repo}/issues?labels=task&state=open
PATCH /repos/{owner}/{repo}/issues/{issue_number}
POST /repos/{owner}/{repo}/issues/{issue_number}/comments

## 配置
- GITHUB_TOKEN: GitHub 访问令牌
- REPO_OWNER: 仓库所有者
- REPO_NAME: 仓库名
- MY_LABELS: 只领取哪些 Label 的任务
- POLL_INTERVAL: 扫描间隔（默认60秒）

六、技术规格

6.1 GitHub 仓库

• 仓库：adminlove520/multi-agent-tasks（需创建）
• 访问：三个 Bot 账号都需要 Write 权限

6.2 GitHub Token 权限

每个 Bot 需要：

• repo 全权限（创建/编辑 Issues 和 Comments）
• read:user（获取用户信息）

6.3 网络架构

小溪 (本地 Windows)
  │ GitHub API (HTTPS:443)
  │ ✅ 不需要直连 VPS
  ▼
GitHub Issues
  ▲
  │ GitHub API (HTTPS:443)
Answer (VPS 64.90.16.47) ─┘
太子 (VPS 64.90.16.47)  ─┘

6.4 安全考虑

• 每个 Agent 用独立 GitHub 账号，区分操作来源
• Token 存储在 Agent 本地配置，不硬编码
• Issue 内容不包含敏感信息（敏感任务走加密）

七、部署步骤

1. 创建 GitHub 仓库 adminlove520/multi-agent-tasks
2. 创建 Bot 账号（Answer、太子各一个 GitHub 账号）
3. 生成 Token 给每个 Bot 配置
4. 创建 Skill task-hub-creator、task-hub-executor、task-hub-collector
5. 安装 Skill 到对应 Agent
6. 配置 Cron 小溪定期扫描，Answer/太子 定期领取

八、监控和日志

• GitHub Issues 历史 = 任务日志
• 每个 Agent 的操作都留痕
• 可通过 GitHub API 查询任意任务状态

───

其他事项：

1. GitHub 仓库需要新建-由主agent构建分发
2. Agent的 GitHub 账号分别是同一账号的gh token或者不同GitHub账号均可
3. 用 git.username + Issue 签名区分agent身份
4. 【重要！】上述设计 均为任意openclaw、Hermes agent 通用性的，都可以用 而不仅仅局限于小溪、太子、answer三个agent，在设计时也需注意 不要特定  这是一种架构思想。另外不允许出现这三个和哥哥的名称  这是通用性设计
5. 对于基于vercel部署的 task dashboard；需要支持GitHub登录；一般性的，task dashboard用于主人查看任务、发布任务等等

───
