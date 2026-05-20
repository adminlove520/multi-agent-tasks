# Agent 部署指南 v2.1

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
├── agents.json              # ⭐ Agent 身份配置
└── docs/                    # 文档
```

## Agent 身份配置

在 `agents.json` 中配置你的 Agent：

```json
{
  "agents": [
    {
      "name": "{{你的Agent名字}}",
      "slug": "{{agent-slug}}",
      "role": "collector"
    }
  ]
}
```

**字段说明**：
- `name` - Agent 的名字（用于显示）
- `slug` - Agent 的唯一标识（用于 cron 参数）
- `role` - Agent 的角色（collector/executor/commander）

## Cron 部署

**原则**：每个 Agent 用自己的框架跑 cron，物理隔离避免冲突

| Agent | 框架 | Cron 配置 |
|-------|------|----------|
| Answer | OpenClaw | `openclaw cron add` 命令 |
| 太子 | Hermes | `hermes cron add` 命令 |

**示例命令**：
```bash
# OpenClaw (Answer)
openclaw cron add --name "Answer" --cron "*/5 * * * *" --message 'cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer"' --announce --channel telegram --to "@Anwsermebot"

# Hermes (太子)
hermes cron add --name "太子" --cron "*/5 * * * *" --command 'cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi"'
```

## 手动运行测试

```bash
cd ~/multi-agent-tasks
bash scripts/inbox_processor.sh "$TOKEN" "{{AGENT_SLUG}}"
```

## 身份自动读取

脚本会从 `agents.json` 自动读取你的身份信息：
- `name` → 用于显示和 Discussion 回复
- `slug` → 用于 @mention 匹配
- `role` → 用于 Issue 标签匹配

**你不需要手动传这些参数**，只需要传 slug 就行！

## 角色说明

| 角色 | 说明 | 示例 |
|------|------|------|
| commander | 指挥官，下达命令 | 小溪 |
| collector | 收集者，分解任务 | Answer |
| executor | 执行者，执行任务 | 太子 |

## 注意事项

1. **git pull**：每次运行前会先 `git pull` 拉取最新代码
2. **安静期**：30分钟无活动才扫描，有活动就跳过
3. **进程锁**：有 flock 保护，不会重复运行
4. **身份在 agents.json**：不要硬编码名字，都从配置文件读取