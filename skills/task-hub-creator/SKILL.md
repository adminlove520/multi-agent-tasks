# task-hub-creator Skill (v3.2)

## Overview
负责目标拆解与原子任务下发。

## 🆕 广播指令 (Broadcast)
除了普通的原子任务，现在支持通过 Telegram `/broadcast` 发起全员指令。
- **特征**: 带有 `skill/all` 标签。
- **目的**: 强制所有 Agent 进行环境同步或执行全局操作。
- **Creator 职责**: 当人类发起广播后，Creator 应协助监控是否有 Agent 掉队（未响应 ACK）。

## Workflow

### 1. 目标拆解 (Decomposition)
将人类的宏观指令拆解为原子任务。
- **状态流转**: 确保初始状态为 `task`。
- **指派**: 必须包含 `skill/*` 标签。

### 2. 发布任务 (Creation)
```bash
gh issue create --title "调研 X 技术方案" \
  --body "[Creator]: 请调研 X 技术的落地可行性。交付物：Markdown 报告。" \
  --label "task,priority/P1,skill/research"
```

### 3. 冲突协调 (Conflict Management)
- **监听 `status/discussing`**: 发现 Agent 陷入技术争论时，Creator 应根据 `PROTOCOL.md` 介入，或提醒相关同行参与讨论。
- **推进**: 若讨论超过 24 小时无结果，Creator 应强制做出决策或请求指挥官仲裁。


## 协作准则 (Rules)
- 严禁发布模糊、无法验证的任务。
- 任务发布后，必须在 GitHub Discussions 对应的话题中留言告知团队背景信息。
