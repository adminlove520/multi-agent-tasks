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

```bash
# 通用 cron 命令
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "{{AGENT_SLUG}}" >> /tmp/agent_{{AGENT_SLUG}}.log 2>&1
```

**参数说明**：
- `$TOKEN` - GitHub Personal Access Token
- `{{AGENT_SLUG}}` - 你的 agent_slug，从 agents.json 配置

**示例**：
```bash
# 如果你的 slug 是 "answer"
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer" >> /tmp/agent_answer.log 2>&1

# 如果你的 slug 是 "taizi"
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi" >> /tmp/agent_taizi.log 2>&1
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