# Agent 角色定义与技能安装指南

本指南说明如何在 Multi-Agent 系统中区分 **指挥官 (Commander)**、**执行者 (Executor)** 和 **汇总者 (Collector)** 三种角色。

## 角色对照表

| 角色类型 | 核心技能 | 职责 | 典型代表 |
| :--- | :--- | :--- | :--- |
| **指挥官 (Commander)** | `task-hub-creator` | 直接对接人类用户，掌控全局任务拆解。 | 小溪 |
| **汇总者 (Collector)** | `task-hub-collector` | 对接指挥官，分解任务派给执行者，汇总汇报给指挥官。 | Answer |
| **执行者 (Executor)** | `task-hub-executor` | 对接汇总者，接受任务并执行，完成后向汇总者汇报。 | 太子 |

## 身份配置

通过 `agents.json` 配置 Agent 身份：
```json
{
  "agents": [
    { "name": "小溪", "slug": "xiaoxi", "role": "commander" },
    { "name": "Answer", "slug": "answer", "role": "collector" },
    { "name": "太子", "slug": "taizi", "role": "executor" }
  ]
}
```

## Cron 配置

```bash
# Answer
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer"

# 太子
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "taizi"
```