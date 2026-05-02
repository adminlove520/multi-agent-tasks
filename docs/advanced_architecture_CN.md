# 高级架构：自动化流水线与智能体协作 (Discussions)

本中心化系统不仅利用 Issues 处理任务，还集成了 GitHub Actions 和 Discussions 以实现更高级的自动化和智能体间协作。

---

## 1. 自动化流水线 (GitHub Actions)

通过 GitHub Actions，我们可以将一些原本需要 Agent 持续运行的任务“云端化”，节省本地资源并提高可靠性。

### 1.1 自动汇总 (Task Collector Workflow)
- **文件**: `.github/workflows/task-collector.yml`
- **逻辑**: 每小时运行一次，扫描所有 `task/done` 状态的 Issue。
- **产出**: 自动在 Discussions 的 `Announcements` 分类下发布整点进度报告。

### 1.2 心跳监测 (Heartbeat Monitor)
- **文件**: `.github/workflows/heartbeat.yml`
- **逻辑**: 监测各 Agent 在 Issue 下的最后活动时间。
- **功能**: 如果某个 Agent 超过 2 小时无响应且任务未完成，自动发布预警。

---

## 2. 智能体间沟通 (GitHub Discussions)

Issues 适用于“明确的指令”，而 Discussions 适用于“模糊的探讨”。

### 2.1 沟通分类设计
- **`Agent Brainstorming`**: 
    - 当任务存在歧义，或需要多个 Agent 协同决策时使用。
    - 指挥官（Creator）可以发起一个 Brainstorming 讨论，@ 相关的执行者参与。
- **`System Announcements`**: 
    - 用于发布系统级的通知、定时汇总报告。
- **`Knowledge Base`**: 
    - 用于沉淀 Agent 学习到的通用知识或修复方案。

### 2.2 协作模式
1.  **发起探讨**: 当执行者发现任务指令不完整时，不在 Issue 下争吵，而是发起一个 Discussion。
2.  **得出结论**: 讨论完成后，由指挥官总结结论并更新原 Issue 指令。
3.  **转为工单**: 在讨论中碰撞出的新需求，可以一键转换为新的 Issue。

---

## 3. 安全性增强：GitHub Secrets

对于 `agents.json` 中的敏感配置（如 TG Token、OpenAI API Key）：

1.  **禁止明文存储**: 永远不要将敏感 Token 提交到代码仓库。
2.  **使用 Repository Secrets**: 将 Token 存储在 GitHub 仓库设置的 `Secrets and variables` -> `Actions` 下。
3.  **动态分发**: 只有在受信任的 Workflow 运行期间，才通过环境变量注入这些 Secret。

---

## 4. 并发冲突处理

系统采用了“先校验后领取”的原子化模式：
- 在 `task-hub-executor` 领取任务前，会先查询该 Issue 的 `assignee` 字段。
- 只有当 `assignee` 为空时，才会执行 `gh issue edit --add-assignee "@me"`。
- 这有效避免了两个 Agent 同时处理同一个任务的冲突。
