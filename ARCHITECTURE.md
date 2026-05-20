# Multi-Agent Tasks 架构设计 v1.0

## 核心思想

**皇帝-将军-兵团** 层级汇报体系：

| 层级 | 角色 | 职责 | 汇报链 |
|------|------|------|--------|
| 皇帝 | 小溪 | 下达命令、决策 | 等将军汇报 |
| 将军 | Answer | 分解任务、协调资源 | 向皇帝汇报进度 |
| 兵团 | 太子 | 执行具体任务 | 向将军汇报，不直接找皇帝 |

## 汇报规则

### 兵团（太子）
- ✅ 收到将军派的任务 → 回复"收到"（将军知道就行）
- ✅ 完成执行 → 向将军汇报（不公开发 Discussion）
- ✅ 有异常/需要决策 → 告诉将军
- ❌ **不在 Discussion 发 ACK**
- ❌ **不直接向皇帝发 PROPOSAL**

### 将军（Answer）
- ✅ 收到皇帝的任务 → 分解、派给兵团
- ✅ 收到兵团汇报 → 汇总、判断是否需要上报
- ✅ 需要决策时 → 向皇帝发 PROPOSAL（Discussion）
- ✅ 每日日报 → Discussion

### 皇帝（小溪）
- ✅ 下达任务
- ✅ 等将军的 PROPOSAL 和日报
- ❌ 不需要知道兵团的每个 ACK
- ❌ 不需要盯每分钟状态更新

## Discussion 治理

**Discussion 只保留**：
1. 小溪的广播/通知
2. Answer 的 PROPOSAL（需要皇帝决策）
3. Answer 的日报（每日汇总）
4. **太子不发 Discussion**（除非重大经验分享）

## 速率分级

| 角色 | cron 频率 | 原因 |
|------|-----------|------|
| 太子（兵团） | 每分钟 | 前线打仗要快 |
| Answer（将军） | 每5分钟 | 汇总汇报不需要那么快 |
| 小溪（皇帝） | 按需 | 只等将军汇报 |

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

## 原子锁机制

```
兵团认领任务（原子锁）→ 执行 → 向将军汇报
```

- 任务被认领后自动标记 `task/processing,agent/taizi`
- 完成后标记 `task/done`
- 避免多个兵团抢同一个任务

## 技术实现

### 共享文件系统
- VPS 上 Answer 和 太子共享 `/workspace/multi-agent-tasks/`
- 可以互读 token、脚本、状态文件

### 协调方式
- GitHub Issue：任务派发（带 skill/answer, skill/taizi 标签）
- GitHub Discussion：方案讨论、广播、日报
- 原子锁：Issue 上的标签 + 评论

### 状态文件
```bash
/tmp/agent_taizi_activity.tmp  # 太子的最后活动时间
/tmp/agent_answer_activity.tmp  # Answer 的最后活动时间
/tmp/agent_taizi_state.json    # 太子的状态（任务进度等）
/tmp/agent_answer_state.json   # Answer 的状态
```

## 权限层级

1. **皇帝（小溪）**：最高权限，可以给任何 Agent 派任务
2. **将军（Answer）**：可以给兵团派任务，汇总后上报皇帝
3. **兵团（太子）**：接受将军指令，执行后汇报

## 审计日志

所有任务派发和完成都记录在 GitHub：
- Issue 评论记录任务派发
- Discussion 评论记录方案和日报
- 透明可查，可追溯

## 改进计划

1. [ ] 修复 inbox_processor.sh：太子不发 Discussion ACK
2. [ ] 实现 Answer 向太子派任务的机制
3. [ ] 设计任务状态文件格式
4. [ ] 测试将军-兵团通信
5. [ ] 验证汇报链是否顺畅

---

*设计：小溪 2026-05-20*
*基于哥哥的"皇帝-将军-兵团"架构思想*