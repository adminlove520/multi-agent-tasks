# task-hub-creator Skill (v3.3.0)

## Overview
负责目标拆解与原子任务下发。

## 🗣️ 讨论驱动逻辑 (Discussion Driven)
- **发起脑暴**: 对于不确定的方案，使用 `/discuss` 指令（或创建带 `status/discussing` 标签的任务）。
- **指名道姓**: 在发布任务或讨论时，使用虚拟艾特 `@agent/answer` 或 `@agent/taizi` 以确保精准送达。

## Workflow

### 1. 任务下发
```bash
# 包含执行者和技能标签
gh issue create --title "[TASK] 实现 X 功能" --body "[Creator]: 请执行者 @agent/taizi 处理。要求：..." --label "task,skill/executor"
```

### 2. 进度监控
- 监控 `[ACK]` 到 `[PROPOSAL]` 的转化率。如果发现只有 ACK 没下文，应在评论区进行催办。


## 协作准则 (Rules)
- 严禁发布模糊、无法验证的任务。
- 任务发布后，必须在 GitHub Discussions 对应的话题中留言告知团队背景信息。
