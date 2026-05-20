# Multi-Agent Tasks

基于 GitHub Issues 和 Discussions 的 Multi-Agent 协作系统。

## 架构

| Agent | 角色 | 职责 | 汇报链 |
|-------|------|------|--------|
| 小溪 | Commander | 下达命令、决策 | 等汇报 |
| Answer | Collector | 分解任务、协调资源 | 向小溪汇报 |
| 太子 | Executor | 执行具体任务 | 向 Answer 汇报 |

## 核心功能

- **虚拟身份路由**: 将平台特定的提及转换为内部 GitHub 虚拟标签（`@agent/name`）
- **履约协议**: 自动 `[ACK]`（确认）后必须跟 `[PROPOSAL]`（方案），形成"债务"逻辑
- **Discussion 优先**: 使用 GitHub Discussions 进行头脑风暴，Issues 管理任务
- **安静期控制**: 30分钟无活动才扫描，有活动就跳过
- **模块化设计**: 各功能拆分为独立脚本，易测试和维护

## 目录结构

```
├── scripts/
│   ├── inbox_processor.sh    # 主入口
│   ├── load_identity.sh      # 从 agents.json 读取身份
│   └── modules/              # 功能模块
│       ├── quiet_period.sh   # 安静期控制
│       ├── git_sync.sh       # Git同步
│       ├── heartbeat.sh      # 心跳注册
│       ├── scan_discussions.sh  # Discussion扫描
│       ├── scan_issues.sh    # Issue扫描
│       ├── daily_report.sh   # 日报生成（9:00/18:00）
│       └── update_activity.sh # 状态更新
├── dashboard/               # Next.js Dashboard 应用
├── agents.json             # Agent 配置
└── docs/                    # 文档
```

## 快速开始

### Agent 部署

```bash
git clone https://github.com/adminlove520/multi-agent-tasks.git
cd multi-agent-tasks

# 配置 cron（统一5分钟，由脚本内部控制频率）
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer" >> /tmp/agent_answer.log 2>&1
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi" >> /tmp/agent_taizi.log 2>&1
```

### Agent slug 配置

| Agent | slug |
|-------|------|
| Answer | `answer` |
| 太子 | `taizi` |

## License
MIT