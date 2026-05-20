# Agent 部署指南 v2.0

## 目录结构

```
multi-agent-tasks/
├── scripts/
│   ├── inbox_processor.sh      # 主入口
│   ├── load_identity.sh       # 身份加载（自动从 agents.json）
│   ├── run-inbox.sh          # 简化入口
│   └── modules/              # 功能模块
│       ├── quiet_period.sh   # 安静期控制
│       ├── git_sync.sh       # Git 同步
│       ├── heartbeat.sh      # 心跳注册
│       ├── scan_discussions.sh # Discussion 扫描
│       ├── scan_issues.sh    # Issue 扫描
│       ├── daily_report.sh   # 日报生成
│       └── update_activity.sh # 状态更新
├── dashboard/                # Next.js Dashboard
├── agents.json              # Agent 身份配置
└── docs/                    # 文档
```

## Agent 身份配置

在 `agents.json` 中配置：

```json
{
  "agents": [
    { "name": "小溪", "slug": "xiaoxi", "role": "commander" },
    { "name": "Answer", "slug": "answer", "role": "collector" },
    { "name": "太子", "slug": "taizi", "role": "executor" }
  ]
}
```

## Cron 部署

每个 Agent 配置自己的 cron：

```bash
# Answer 的 cron
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer" >> /tmp/agent_answer.log 2>&1

# 太子 的 cron
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi" >> /tmp/agent_taizi.log 2>&1
```

**参数说明**：
- `$TOKEN` - GitHub Personal Access Token
- `"answer"` 或 `"taizi"` - Agent 的 slug，从 agents.json 读取对应身份

## 手动运行测试

```bash
# 进入目录
cd ~/multi-agent-tasks

# 测试 Answer
bash scripts/inbox_processor.sh "$TOKEN" "answer"

# 测试 太子
bash scripts/inbox_processor.sh "$TOKEN" "taizi"
```

## 汇报链

| Agent | 汇报给 |
|-------|--------|
| 太子 | Answer |
| Answer | 小溪 |

## 注意事项

1. **git pull**：每次运行前会先 git pull 拉取最新代码
2. **安静期**：30分钟无活动才扫描，有活动就跳过
3. **进程锁**：有 flock 保护，不会重复运行
4. **身份自动读取**：不需要手动传 role_label，从 agents.json 自动获取