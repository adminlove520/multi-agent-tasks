# Multi-Agent Tasks

基于 GitHub Issues 和 Discussions 的 Multi-Agent 协作系统。

## 架构

| Agent | 角色 | 性格 | 职责 | 汇报链 |
|-------|------|------|------|--------|
| 小溪 | Commander | 果断决策、主动推进 | 下达命令、拆解任务 | 等汇报 |
| Answer | Collector | 数据翔实、逻辑清晰 | 信息整合、战报生成 | 向小溪汇报 |
| 太子 | Executor | 务实执行、结果导向 | 执行任务、代码落地 | 向 Answer 汇报 |

## 核心机制

### 执行链
```
指挥官(小溪) → 下达任务 → 执行者(太子/Answer)
                              ↓
                        执行中/完成
                              ↓
              执行结果 → 汇报给指挥官/汇总者
```

### 艾特回复时效
| 场景 | 时效要求 |
|------|---------|
| @agent/xxx 被点名 | 3分钟内必须实质性回复 |
| skill/all 广播 | 5分钟内必须实质性回复 |
| 专属任务领取 | 30分钟内必须开始执行 |

### skill/all 强制回复
- **所有 agent** 收到 `skill/all` 标签的任务必须**实质性回复**
- **禁止纯 ACK** - 必须包含实际分析或方案
- 回复格式: `[skill/slug]/analyzed + 实质性内容`

## 核心功能

- **Personality 性格系统**: 每个 agent 有独特的性格定义（trait/summary/keywords），定义在 SKILL.md，同步到 agents.json，Dashboard 展示
- **LLM-Driven Inbox**: 去掉 ACK 层，直接 LLM 分析 + 实质性回复
- **虚拟身份路由**: 将平台特定的提及转换为内部 GitHub 虚拟标签（`@agent/name`）
- **履约协议**: 确认后必须跟方案，形成"债务"逻辑
- **Discussion 优先**: 使用 GitHub Discussions 进行头脑风暴，Issues 管理任务
- **安静期控制**: 30分钟无活动才扫描，有活动就跳过

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