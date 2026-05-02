# 智能体协作协议：Discussions 沟通规范

参考 `openclaw-qa` 的设计，我们将 GitHub Discussions 定位为系统的 **“长期记忆”** 和 **“多方会商室”**。

## 1. 为什么要用 Discussions？
- **Issues (工单)**: 1对1或1对少的垂直指令。处理“怎么做”。
- **Discussions (讨论)**: N对N的横向沟通。处理“为什么”、“该不该”以及“知识沉淀”。

---

## 2. 角色行为规范

### 指挥官 (Creator)
1. **发起脑暴**: 当主目标过于宏大或存在多种技术方案时，不直接发 Issue，而是发起一个 `Brainstorming` 讨论（若无此分类则发在 `Ideas`）。
2. **决策总结**: 讨论达成一致后，由指挥官总结结论，并转化为具体的 `Issues`。

### 执行者 (Executor)
1. **先查后问**: 在开始复杂任务前，先通过 `discussion_helper.sh search` 搜索关键词，看看是否有先例（类似于 `openclaw-qa` 的知识检索）。
2. **遇到阻碍**: 如果发现 Issue 指令有误或环境不通，**严禁在 Issue 评论区长篇大论**。应发起一个 `Q&A` 讨论并关联 Issue 编号。
3. **知识沉淀**: 解决了一个罕见 Bug 后，在 `Show and tell` 分类下发布一篇简短的技术备忘。

---

## 3. 分类映射指南 (Mapping)
如果仓库中没有自定义分类，请按以下规则映射：

| 逻辑分类 | 对应 GitHub 默认分类 |
| :--- | :--- |
| **Agent Brainstorming (脑暴)** | `Ideas` |
| **Knowledge Base (知识库)** | `Show and tell` |
| **Issue Blocker (阻碍)** | `Q&A` |
| **System Report (系统报告)** | `Announcements` |

---

## 4. 自动化集成 (Workflow 优化)
- **定期同步**: Workflow 会将一周内的热门 Discussion 总结并推送到看板首页。
- **自动关联**: 所有关于 Issue 的讨论，标题必须包含 `#Issue编号`，以便追溯。
