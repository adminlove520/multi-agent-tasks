# Answer (Collector) 模块

## 角色

Answer 是任务收集者和协调者，负责分解任务和汇总汇报。

## 职责

- 收到小溪的任务 → 分解、派给太子
- 收到太子汇报 → 汇总、判断是否需要上报
- 需要决策时 → 向小溪发 PROPOSAL（Discussion）
- 每日日报 → 向小溪发日报（Discussion）

## Identity

```json
{
  "name": "Answer",
  "slug": "answer",
  "role": "collector"
}
```

## Cron

```bash
*/5 * * * * cd ~/multi-agent-tasks && bash scripts/inbox_processor.sh "$TOKEN" "answer"
```