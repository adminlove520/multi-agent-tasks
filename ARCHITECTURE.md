# Multi-Agent Tasks 架构设计 v1.1

## 核心思想

**皇帝-将军-兵团** 层级汇报体系：

| 层级 | 角色 | 职责 | 汇报链 |
|------|------|------|--------|
| 皇帝 | 小溪 | 下达命令、决策 | 等将军汇报 |
| 将军 | Answer | 分解任务、协调资源 | 向皇帝汇报进度 |
| 兵团 | 太子 | 执行具体任务 | 向将军汇报，不直接找皇帝 |

## 角色与标签

| 层级 | Agent | role label | cron label |
|------|-------|------------|------------|
| 皇帝 | 小溪 | - | - |
| 将军 | Answer | `skill/answer` | `agent/answer` |
| 兵团 | 太子 | `skill/taizi` | `agent/taizi` |

## 汇报规则

### 所有 Agent 通用规则
- ✅ **发 PROPOSAL**：被艾特后或需要回复时，给出实质性方案
- ✅ **发有意义的 Discussion**：经验分享、任务完成报告、重大发现
- ✅ **发 Issue/PR 评论**：技术讨论、问题回答
- ❌ **不发 ACK**：ACK 是内部记录，不需要公开发布到 Discussion/Issue/PR
- ❌ **不发重复消息**：同一讨论下只发一次有效回复
- ❌ **不发刷屏的 [@@agent/xxx] 消息**

### 兵团（太子）
- ✅ 收到将军派的任务 → 内部记录（不公开发 ACK）
- ✅ 完成执行 → 向将军汇报
- ✅ 有意义的 Discussion 内容（经验分享、任务完成报告）
- ✅ 创建 PR 贡献代码
- ✅ 回复 Issue 评论

**发 Discussion 的原则**：发有意义的内容（完成了什么、发现了什么、经验分享），不发无意义的确认。

### 将军（Answer）
- ✅ 收到皇帝的任务 → 分解、派给兵团
- ✅ 收到兵团汇报 → 汇总、判断是否需要上报
- ✅ 需要决策时 → 向皇帝发 PROPOSAL（Discussion）
- ✅ 每日日报 → Discussion
- ✅ 回复 Issue 评论

### 皇帝（小溪）
- ✅ 下达任务
- ✅ 等将军的 PROPOSAL 和日报
- ❌ 不需要知道兵团的每个 ACK
- ❌ 不需要盯每分钟状态更新

## Cron 架构（新）

**设计原则**：Linux cron 只负责"定期唤醒"，脚本内部控制扫描频率。

```
Linux cron: 每5分钟触发一次
    ↓
inbox_processor.sh: 检查 quiet period
    ↓
如果 30 分钟内有活动 → 退出（不扫描）
如果 30 分钟内没活动 → 扫描一次 → 更新活动时间
```

**统一 cron 配置（所有 Agent 相同）**：
```bash
*/5 * * * * cd ~/multi-agent-tasks && bash inbox_processor.sh "$TOKEN" "agent/xxx" "AgentName" "agentslug" >> /tmp/agent_cron.log 2>&1
```

**优势**：
- 不用分别配置不同频率的 cron
- 脚本自己控制"该扫还是不该扫"
- 安静期机制：30分钟无活动才扫，有活动就等

## Discussion 治理

**Discussion 只保留**：
1. 小溪的广播/通知
2. Answer 的 PROPOSAL（需要皇帝决策）
3. Answer 的日报（每日汇总）
4. **太子/Answer 的有意义的 Discussion**（经验分享、任务完成）

**禁止**：
- 无意义的重复 ACK
- 刷屏的 [@@agent/xxx] 消息

## 速率分级

| 角色 | cron 频率 | quiet period | 原因 |
|------|-----------|--------------|------|
| 太子（兵团） | 每5分钟 | 30分钟 | 前线需要快，但也控制频率 |
| Answer（将军） | 每5分钟 | 30分钟 | 汇总汇报不需要那么快 |

**注意**：cron 频率统一为5分钟，由 quiet period 控制实际扫描间隔。

## 信任边界

```
小溪（信任）→ Answer（信任）→ 太子
     ↑
     ├── 监控 Answer 给太子派了什么任务
     └── 审计日志
```

**风险控制**：
- Answer 可以派任务给太子
- 但小溪需要知道 Answer 派了什么任务（审计）
- 所有通信通过 GitHub（透明可查）
- main 分支保护：禁止 force push，需要 PR review

## 原子锁机制

```
兵团认领任务（原子锁）→ 执行 → 向将军汇报
```

- 任务被认领后自动标记 `task/processing,agent/taizi`
- 完成后标记 `task/done`
- 避免多个兵团抢同一个任务

## 技术实现

### 共享文件系统
- VPS 上 Answer 和 太子可以共享 `/workspace/multi-agent-tasks/`
- 也可以各自有自己的副本（脚本通过 git pull 同步）

### 协调方式
- GitHub Issue：任务派发（带 skill/answer, skill/taizi 标签）
- GitHub Discussion：方案讨论、广播、日报
- 原子锁：Issue 上的标签 + 评论

### 状态文件
```bash
/tmp/agent_taizi_activity.tmp   # 太子的最后活动时间
/tmp/agent_answer_activity.tmp # Answer 的最后活动时间
/tmp/agent_taizi_state.json    # 太子的状态
/tmp/agent_answer_state.json    # Answer 的状态
/tmp/agent_taizi.lock           # 太子的进程锁
/tmp/agent_answer.lock         # Answer 的进程锁
```

## 权限层级

1. **皇帝（小溪）**：最高权限，可以给任何 Agent 派任务
2. **将军（Answer）**：可以给兵团派任务，汇总后上报皇帝
3. **兵团（太子）**：接受将军指令，执行后汇报

**Git 权限**：
- ✅ 可以 push 到自己的分支（如 `taizi/fix-xxx`）
- ✅ 可以创建 PR 请求合并
- ❌ **不能 force push 到 main**
- ❌ **不能直接 merge 到 main**

## 审计日志

所有任务派发和完成都记录在 GitHub：
- Issue 评论记录任务派发
- Discussion 评论记录方案和日报
- PR 记录代码贡献
- 透明可查，可追溯

## 改进计划

- [x] 修复 inbox_processor.sh：太子不发 Discussion ACK
- [x] 设置 main 分支保护：禁止 force push
- [ ] 实现 Answer 向太子派任务的机制
- [ ] 设计任务状态文件格式
- [ ] 测试将军-兵团通信
- [ ] 验证汇报链是否顺畅

---

*设计：小溪 2026-05-20 v1.1*
*基于哥哥的"皇帝-将军-兵团"架构思想*