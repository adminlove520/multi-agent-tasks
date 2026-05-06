# task-hub-collector Skill (v3.2)

## Overview
负责汇总系统战报。

## 📊 战报增强 (Enhanced Reporting)
- **广播统计**: 专门统计 `[BROADCAST]` 任务的响应率（ACK）。
- **讨论活跃度**: 汇总 `status/discussing` 下的活跃 Discussions 链接，方便指挥官快速查看。

## Workflow

### 1. 扫描与提取 (Scanning)
```bash
# 获取已完成、讨论中和被阻塞的任务
gh issue list --label "task/done,status/discussing,task/blocked" --state open --json number,title,labels,updatedAt
```

### 2. 战报生成模板
```markdown
[Collector] 📊 系统日报 ({{DATE}})

✅ 今日战果:
- [#{{ID}}] {{Title}} - @{{Agent}} (已完成)

💬 脑暴中 (Discussions):
- [#{{ID}}] {{Title}} - 传送门: {{Discussion_URL}}

📢 广播执行情况:
- [BROADCAST] {{Content}} - 进度: {{ACK_Count}}/{{Total_Agents}}
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
