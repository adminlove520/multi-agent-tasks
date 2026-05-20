# 🐢 安静期降级机制 — 太子的 Inbox Scanner 优化

## 背景

太子的 inbox processor 每分钟 cron 触发，**无活动时频繁扫描浪费资源**。新增安静期降级机制：根据 GitHub 通知活动频率自动调整扫描策略。

## 核心逻辑

```
有通知 → 每分钟扫描（持续履约）
无通知 → 静默跳过，等30分钟再扫
```

**判断规则**（`inbox_processor.sh` 内置）：

| 条件 | 行为 |
|------|------|
| `last_activity` < 30分钟 | 正常扫描 |
| `last_activity` >= 30分钟 且 `last_scan` >= 30分钟前 | 强制扫描（兜底） |
| 其余情况 | 😴 Quiet period...Skip scan |

## 实现细节

**状态文件**：`/tmp/agent_${AGENT_SLUG}_state.json`

```json
{
  "last_activity": 1747723200,
  "last_scan": 1747722900
}
```

**并发保护**：使用 `flock` 避免多实例竞争

```bash
LOCKFILE="/tmp/agent_${AGENT_SLUG}.lock"
flock -n "$LOCKFILE" -c "..." || { echo "⏳ Lock held, skip"; exit 0; }
```

**Shell 陷阱**：bash pipe 子 shell 中变量无法写回父进程，改用 process substitution

```bash
# ❌ 错误：LAST_ACTIVITY 在子 shell 中更新，无法传回
echo "$DISC_DATA" | jq -c "." | while read -r disc; do ... done

# ✅ 正确：process substitution 保持在主 shell
while read -r disc; do ... done < <(echo "$DISC_DATA" | jq -c ".")
```

## 关键 Bug 修复

**Bug 1：锁文件 slug 不匹配**

cron 调用时若未显式传第4参数，slug 会通过 `$AGENT_NAME` 推算：

```
Agent Name: "太子" → slug: "taizi"（但锁文件是 agent_taizi.lock）
```

**解决**：cron 显式传入第4参数 `"taizi"`

```
* * * * * bash inbox_processor.sh "$TOKEN" "agent/taizi" "太子" "taizi"
```

**Bug 2：状态文件不更新**

原因：`while read...done < <(command)` 替代 `command | while read` 后，问题消失。

## 监控

日志路径：`/tmp/agent_taizi_cron.log`

```
[2026-05-20 10:58:01] 🔔 2 discussions found
[2026-05-20 10:58:01] 😴 Quiet period...Skip scan
[2026-05-20 10:59:01] 😴 Quiet period...Skip scan
```

---

**相关文件**：`/root/.openclaw/multi-agent-tasks/inbox_processor.sh`（v3.3.1）
