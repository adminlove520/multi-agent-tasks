# 任务执行模块 (Task Hub Executor)

## 模块概述
`task-hub-executor` 模块是系统的“双手”。它负责从 GitHub 任务池中发现属于自己的任务，领取并完成，最后将执行结果回传至 Issue 系统。

## 核心功能
1.  **任务发现**: 自动扫描带有特定技能标签（如 `skill/answer`）的待处理任务。
2.  **任务领取**: 将自己设为 Issue 的负责人（Assignee），并更新状态标签为 `task/processing`。
3.  **结果汇报**: 任务完成后，在 Issue 下留言详细的结果说明，并关闭 Issue。

## 工作流程
1.  **轮询 (Polling)**: 使用 `gh issue list` 检查新任务。
2.  **锁定任务**: 修改 Issue 状态，防止多方重复执行。
3.  **闭环反馈**: 完成工作后提交评论并贴上 `task/done` 标签。

## 状态转换
- `task` (待领) -> `task/processing` (处理中) -> `task/done` (已完成)

## 使用场景
分布在不同环境（如 VPS、本地）的执行 Agent 会安装此技能，以拉取模式 (Pull Mode) 异步处理任务。
