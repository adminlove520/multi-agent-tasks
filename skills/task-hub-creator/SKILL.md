# task-hub-creator Skill (v3.1)

## Overview
负责目标拆解与原子任务下发，通过看板或命令行向系统注入任务流。

## Workflow

### 1. 目标拆解 (Decomposition)
将人类的宏观指令拆解为可被单人 Agent 完成的原子任务。
- **颗粒度**: 每个 Issue 应对应一个明确的交付物。
- **指派**: 必须附带 `skill/*` 标签以触发对应 Agent。

### 2. 发布任务 (Creation)
使用标准的标签体系发布 Issue。
```bash
gh issue create --title "调研 X 技术方案" \
  --body "[Creator]: 请调研 X 技术的落地可行性。交付物：Markdown 报告。" \
  --label "task,priority/P1,skill/research"
```

### 3. 监控与督办
- 监听 `task/blocked` 标签。
- 发现阻塞时，主动发起 `Discussions` 协调资源。

## 协作准则 (Rules)
- 严禁发布模糊、无法验证的任务。
- 任务发布后，必须在 GitHub Discussions 对应的话题中留言告知团队背景信息。
