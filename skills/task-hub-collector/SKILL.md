# task-hub-collector Skill (v3.1)

## Overview
负责跨智能体收集已完成的任务 (`task/done`)，并生成结构化的系统战报推送至指挥部 (Telegram)。

## Workflow

### 1. 扫描与提取 (Scanning)
利用 `gh` CLI 获取最近完成的任务，识别各个智能体的贡献。
```bash
# 获取最近 24 小时内关闭的已完成任务
gh issue list --label "task/done" --state closed --json number,title,labels,updatedAt --limit 20
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
