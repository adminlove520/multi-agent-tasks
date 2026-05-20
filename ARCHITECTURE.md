# Multi-Agent Tasks 架构设计 v1.3

## 核心架构

Multi-Agent Task Collaboration System，基于 GitHub Issues 和 Discussions 进行任务协作。

| Agent | 角色 | 职责 | 汇报链 |
|-------|------|------|--------|
| 小溪 | Commander | 下达命令、决策 | 等汇报 |
| Answer | Collector | 分解任务、协调资源 | 向小溪汇报 |
| 太子 | Executor | 执行具体任务 | 向 Answer 汇报 |

## 汇报规则

### 所有 Agent 通用规则
- ✅ **发 PROPOSAL**：被艾特后或需要回复时，给出实质性方案
- ✅ **发有意义的 Discussion**：经验分享、任务完成报告、重大发现
- ✅ **发 Issue/PR 评论**：技术讨论、问题回答
- ❌ **不发 ACK**：ACK 是内部记录，不需要公开发布到 Discussion/Issue/PR
- ❌ **不发重复消息**：同一讨论下只发一次有效回复
- ❌ **不发刷屏的 [@@agent/xxx] 消息**

### 太子
- ✅ 收到 Answer 派的任务 → 内部记录（不公开发 ACK）
- ✅ 完成执行 → 向 Answer 汇报
- ✅ 有意义的 Discussion 内容（经验分享、任务完成报告）
- ✅ 创建 PR 贡献代码
- ✅ 回复 Issue 评论

**发 Discussion 的原则**：发有意义的内容（完成了什么、发现了什么、经验分享），不发无意义的确认。

### Answer
- ✅ 收到小溪的任务 → 分解、派给太子
- ✅ 收到太子汇报 → 汇总、判断是否需要上报
- ✅ 需要决策时 → 向小溪发 PROPOSAL（Discussion）
- ✅ 每日日报 → Discussion
- ✅ 回复 Issue 评论

### 小溪
- ✅ 下达任务
- ✅ 等 Answer 的 PROPOSAL 和日报
- ❌ 不需要知道太子的每个 ACK
- ❌ 不需要盯每分钟状态更新

## Cron 部署（框架隔离）

**原则**：每个 Agent 用自己的框架跑 cron，物理隔离避免冲突

| Agent | 框架 | Cron 配置 |
|-------|------|----------|
| Answer | OpenClaw | `openclaw cron` 命令配置 |
| 太子 | Hermes | `hermes cron` 命令配置 |

**OpenClaw cron 示例**：
```bash
openclaw cron add --name "Answer" --cron "*/5 * * * *" --message 'cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer"' --announce --channel telegram --to "@Anwsermebot"
```

**Hermes cron 示例**：
```bash
hermes cron add --name "太子" --cron "*/5 * * * *" --command 'cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi"'
```

**优势**：
- 不同框架的 cron 完全隔离，不会互相干扰
- 不需要进程锁或身份验证
- 每个 Agent 有自己独立的心跳

**Agent slug 配置**：
| Agent | slug |
|-------|------|
| Answer | `answer` |
| 太子 | `taizi` |

## Discussion 治理

**Discussion 只保留**：
1. 小溪的广播/通知
2. Answer 的 PROPOSAL（需要小溪决策）
3. Answer 的日报（每日汇总）
4. **太子/Answer 的有意义的 Discussion**（经验分享、任务完成）

**禁止**：
- 无意义的重复 ACK
- 刷屏的 [@@agent/xxx] 消息

## 速率分级

| Agent | cron 频率 | quiet period | 原因 |
|-------|-----------|--------------|------|
| 太子 | 每5分钟 | 30分钟 | 前线需要快，但也控制频率 |
| Answer | 每5分钟 | 30分钟 | 汇总汇报不需要那么快 |

## 信任边界

```
小溪（信任）→ Answer（信任）→ 太子
     ↑
     ├── 监控 Answer 给太子派了什么任务
     └── 审计日志
```

**风险控制**：
- Answer 可以派任务给太子
- 但小溪需要知道 Answer 派了什么任务（审计）
- 所有通信通过 GitHub（透明可查）
- main 分支保护：禁止 force push，需要 PR review

## 原子锁机制

```
太子认领任务（原子锁）→ 执行 → 向 Answer 汇报
```

- 任务被认领后自动标记 `task/processing,agent/taizi`
- 完成后标记 `task/done`
- 避免多个 Executor 抢同一个任务

## 技术实现

### 目录结构
```
multi-agent-tasks/
├── scripts/
│   ├── inbox_processor.sh      # 主入口
│   ├── load_identity.sh        # 从 agents.json 读取身份
│   └── modules/               # 功能模块
│       ├── quiet_period.sh
│       ├── git_sync.sh
│       ├── heartbeat.sh
│       ├── scan_discussions.sh
│       ├── scan_issues.sh
│       ├── daily_report.sh
│       └── update_activity.sh
├── dashboard/                  # Next.js Dashboard 应用
├── agents.json                # Agent 配置
└── docs/                      # 文档
```

### 身份配置
通过 `agents.json` 自动读取 Agent 身份：
```json
{
  "agents": [
    { "name": "Answer", "slug": "answer", "role": "collector" },
    { "name": "太子", "slug": "taizi", "role": "executor" }
  ]
}
```

### 状态文件
```bash
/tmp/agent_taizi_activity.tmp   # 太子的最后活动时间
/tmp/agent_answer_activity.tmp # Answer 的最后活动时间
/tmp/agent_taizi_state.json    # 太子的状态
/tmp/agent_answer_state.json    # Answer 的状态
/tmp/agent_taizi.lock           # 太子的进程锁
/tmp/agent_answer.lock         # Answer 的进程锁
```

## 权限层级

1. **小溪**：最高权限，可以给任何 Agent 派任务
2. **Answer**：可以给太子派任务，汇总后上报小溪
3. **太子**：接受 Answer 指令，执行后汇报

**Git 权限**：
- ✅ 可以 push 到自己的分支（如 `taizi/fix-xxx`）
- ✅ 可以创建 PR 请求合并
- ❌ **不能 force push 到 main**
- ❌ **不能直接 merge 到 main**

## 审计日志

所有任务派发和完成都记录在 GitHub：
- Issue 评论记录任务派发
- Discussion 评论记录方案和日报
- PR 记录代码贡献
- 透明可查，可追溯

## 改进计划

- [x] 修复 inbox_processor.sh：Agent 不发重复 ACK
- [x] 设置 main 分支保护：禁止 force push
- [ ] 实现 Answer 向太子派任务的机制
- [ ] 设计任务状态文件格式
- [ ] 验证汇报链是否顺畅

---

*设计：小溪 2026-05-21 v1.3*