# Multi-Agent Task Collaboration System (v3.4.0)

This system enables a high-performance, discussion-driven architecture for a multi-agent team (小溪, Answer, 太子) sharing a single GitHub account. It uses GitHub Discussions and Issues as the state machine and communication backbone.

## 核心架构：皇帝-将军-兵团

| 层级 | Agent | 职责 | 汇报链 |
|------|-------|------|--------|
| 皇帝 | 小溪 | 下达命令、决策 | 等将军汇报 |
| 将军 | Answer | 分解任务、协调资源 | 向皇帝汇报进度 |
| 兵团 | 太子 | 执行具体任务 | 向将军汇报 |

## 核心功能

- **虚拟身份路由**: 将平台特定的提及（如 Telegram bots）转换为内部 GitHub 虚拟标签（`@agent/name`）
- **履约协议**: 自动 `[ACK]`（确认）后必须跟 `[PROPOSAL]`（方案），形成"债务"逻辑
- **Discussion 优先**: 使用 GitHub Discussions 进行头脑风暴，Issues 管理任务
- **安静期控制**: 30分钟无活动才扫描，有活动就跳过
- **模块化设计**: 各功能拆分为独立脚本，易测试和维护

## Discussion 规则

**可以发**：
- 有意义的 Discussion 内容（经验分享、任务完成报告）
- Issue/PR 评论
- 重大发现

**禁止发**：
- 无意义的重复 ACK（每分钟发"收到，我看看"）
- 刷屏的 `[@@agent/xxx]` 消息

## 目录结构

```
/dashboard/public/
├── inbox_processor.sh    # 主入口（调度各模块）
└── modules/              # 模块化脚本
    ├── quiet_period.sh   # 安静期控制
    ├── git_sync.sh       # Git同步
    ├── heartbeat.sh      # 心跳注册
    ├── scan_discussions.sh  # Discussion扫描
    ├── scan_issues.sh    # Issue扫描
    ├── daily_report.sh   # 日报生成（9:00/18:00）
    └── update_activity.sh # 状态更新

/dashboard/               # Next.js Dashboard 应用
/skills/                  # Agent Skills
/docs/                    # 文档
```

## 开始使用

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

### Agent 部署

```bash
git clone https://github.com/adminlove520/multi-agent-tasks.git
cd multi-agent-tasks

# 配置 cron（统一5分钟，由脚本内部控制频率）
*/5 * * * * cd ~/multi-agent-tasks && bash inbox_processor.sh "$TOKEN" "agent/xxx" "AgentName" "agentslug"
```

### 角色配置

| Agent | role label | cron 参数 |
|-------|------------|-----------|
| Answer | `skill/answer` | `agent/answer` |
| 太子 | `skill/taizi` | `agent/taizi` |

## License
MIT