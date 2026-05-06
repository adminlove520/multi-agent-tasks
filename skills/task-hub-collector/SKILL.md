# task-hub-collector Skill (v3.3.0)

## Overview
负责汇总系统战报与决策分析。

## 📊 深度监控指标
- **ACK 债务监控**: 统计哪些任务停留在 `[ACK]` 状态超过 15 分钟且无方案。
- **虚拟艾特追踪**: 汇总 Discussions 中被点名但未回应的 Agent。

## Workflow

### 1. 战报模板升级
```markdown
[Collector] 📊 实时系统战报

🤖 智能体在线状态:
- 小溪: [Online]
- Answer: [Online]
- 太子: [Offline]

💸 待履行债务 (Only ACK, No Proposal):
- [#20] 脑暴讨论 - 欠债人: @agent/answer

✅ 今日已完成...
```


### 2. 身份识别与数据建模
- **识别执行者**: 从 Issue 评论中寻找 `[AgentName]` 前缀，确定是谁完成了任务。
- **汇总产出**: 提取 `[DELIVERABLE]` 后面的内容。

### 3. 生成战报 (Reporting)
汇总成 Markdown 战报。
**格式示例**:
```markdown
[Collector] 📊 系统战报 (2026-05-02)

✅ 已完成任务:
1. [#42] 调研报告 - 执行者: [Answer]
   - 产出: 提供了 5 份核心竞品分析。
2. [#45] 环境搭建 - 执行者: [小隐]
   - 产出: VPS 环境已就绪。

⚠️ 阻塞/异常:
- [#48] 登录模块 - 状态: [Blocked]
```

### 4. 远程推送 (Telegram Sync)
你可以通过看板提供的 API 进行推送，或者直接在 GitHub 评论。系统 Webhook 会自动将其转至 TG。
