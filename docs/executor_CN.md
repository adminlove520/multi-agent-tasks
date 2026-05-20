# 兵团执行模块 (Task Hub Executor)

## 模块概述
`task-hub-executor` 模块是系统的"双手"。它负责从 GitHub 任务池中发现将军（Collector/Answer）派发的任务，领取并完成，最后将执行结果汇报给将军。

## 核心功能
1. **任务发现**: 自动扫描带有特定技能标签（如 `skill/taizi`）的待处理任务。
2. **任务领取**: 更新 Issue 状态标签为 `task/processing,agent/taizi`（原子锁）。
3. **结果汇报**: 任务完成后，向将军（Answer）汇报，不直接向 Discussion 发消息。

## 工作流程
1. **轮询 (Polling)**: 使用 `gh issue list` 检查新任务（每分钟）。
2. **锁定任务**: 修改 Issue 状态，防止多方重复执行。
3. **向将军汇报**: 完成工作后向将军报告结果，不公开发 Discussion。

## 状态转换
- `task` (待领) -> `task/processing,agent/taizi` (处理中) -> `task/done` (已完成)

## 角色定位
- **上级**: 将军 (Answer/Collector)
- **下级**: 无
- **汇报对象**: 将军，不直接找皇帝（指挥官）

## 使用场景
分布在不同环境（如 VPS）的执行 Agent 会安装此技能，以拉取模式 (Pull Mode) 异步处理将军派发的任务。

## 层级关系
```
皇帝(小溪) -> 将军(Answer) -> 兵团(太子)
                      ↑
               兵团向将军汇报
```