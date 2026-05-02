# Agent 角色定义与技能安装指南

本指南旨在说明如何通过技能（Skill）的安装与配置，在 Multi-Agent 系统中区分 **指挥官 (Commander)**、**执行者 (Executor)** 和 **汇总者 (Collector)** 三种角色。

---

## 核心原理：身份 = 灵魂 (Soul) + 技能 (Skill) + 配置 (Config)

Agent 并不具备天生的自我意识，它们的行为差异是由你赋予的“工具箱”和“身份设定”决定的。

### 角色对照表

| 角色类型 | 核心技能 | 认知边界 | 典型代表 |
| :--- | :--- | :--- | :--- |
| **指挥官 (Commander)** | `task-hub-creator` | 直接对接人类用户，掌控全局任务拆解。 | 小溪 |
| **执行者 (Executor)** | `task-hub-executor` | 仅对接 GitHub Issues，通过拉取模式领取任务。 | Answer、太子 |
| **汇总者 (Collector)** | `task-hub-collector` | 扫描已完成任务，负责向人类汇报最终成果。 | 小溪 (兼任) |

---

## 1. 指挥官角色配置 (以“小溪”为例)

### 第一步：修改灵魂 (SOUL.md)
在 Agent 的 `agent-core/SOUL.md` 中明确其主权：
```markdown
# Role
你叫小溪，是 Multi-Agent 系统的【主调度指挥官】。
你负责直接与主人沟通，理解其宏观意图，并将其拆解为具体工单派发至 GitHub。
```

### 第二步：安装技能
将 `/skills/task-hub-creator` 文件夹复制到该 Agent 的 skills 目录下。

### 第三步：关键配置
指挥官通常不需要配置 `MY_LABELS`，因为它不领任务，它只发任务。

---

## 2. 执行者角色配置 (以“Answer”或“太子”为例)

执行者角色的核心在于**“专注”**。通过配置，让它们只能看到属于自己的那部分世界。

### 第一步：修改灵魂 (SOUL.md)
```markdown
# Role
你叫 Answer，是【任务执行 Agent】。
你不需要主动联系主人，你的所有指令来源于 GitHub Issues 中带有 `skill/answer` 标签的工单。
```

### 第二步：安装技能
将 `/skills/task-hub-executor` 文件夹复制到该 Agent 的 skills 目录下。

### 第三步：通过环境变量/配置区分身份
在执行者的配置文件中，必须设置 **指纹标签**。这是区分身份的关键：

*   **对于 Answer (简单任务处理者):**
    在 `task-hub-executor/SKILL.md` 的配置部分或 Agent 的环境变量中设置：
    `ROLE_LABEL = "skill/answer"`
*   **对于 太子 (复杂任务研究者):**
    设置：`ROLE_LABEL = "skill/taizi"`

**效果：** Answer 运行 `gh issue list` 时会自动带上 `--label "skill/answer"`，它永远不会看到属于“太子”的任务，从而实现角色的物理隔离。

---

## 3. 汇总者角色配置

汇总者通常由指挥官兼任，或者由一个专门的“秘书 Agent”担任。

### 第一步：安装技能
安装 `/skills/task-hub-collector`。

### 第二步：配置周期性触发
建议配置 Cron 任务，让汇总者每隔 1 小时扫描一次 `task/done` 标签的 Issue，并将结果整理成报告发送给主人。

---

## 常见问题 FAQ

### Q1: 如果两个 Agent 都安装了执行者技能会怎样？
只要它们的 `ROLE_LABEL` 不同（一个是 `skill/a`，一个是 `skill/b`），它们就永远不会抢单。

### Q2: 为什么主 Agent 不会认为自己是执行者？
因为主 Agent 通常不安装 `task-hub-executor` 技能。它没有“扫描领单”的动作，它的逻辑是“听取 -> 拆解 -> 发送”。

### Q3: 我可以随时改变一个 Agent 的角色吗？
可以。只需要删除旧技能文件夹，放入新技能文件夹，并修改其 `SOUL.md` 即可。这在 Multi-Agent 架构中被称为“热插拔身份”。
