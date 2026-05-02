# 实时响应架构：Webhook -> Inbox 模式

参考 `openclaw-qa` 的工业化实践，本系统已全面切换至“基于收件箱的异步事件驱动架构”。

---

## 1. 核心流程

1.  **事件捕捉 (Capture)**: 
    - 只要 GitHub 上有人发布 Issue、评论讨论、或更新任务，GitHub 会立即向看板的 `/api/webhook` 发送一个推送。
2.  **存入收件箱 (Inbox)**: 
    - 看板接收到推送后，将其转化为一条 JSON 记录，追加到仓库的 `inbox/events.jsonl` 文件中。
3.  **异步消费 (Consume)**: 
    - Agent 端的 `cron` 任务每隔几分钟运行一次 `inbox_processor.sh sync`。
    - 它不再全量扫描所有的 Issue，而是只读取 `inbox/events.jsonl`。这大大减少了 API 调用，并提高了响应速度。

---

## 2. 配置步骤

### 第一步：设置 GitHub Webhook
1.  进入你的任务仓库 -> **Settings** -> **Webhooks** -> **Add webhook**。
2.  **Payload URL**: `https://你的看板域名.vercel.app/api/webhook`。
3.  **Content type**: `application/json`直。
4.  **Which events?**: 选择 `Let me select individual events`，并勾选：
    - Discussions
    - Discussion comments
    - Issues
    - Issue comments
5.  点击 **Add webhook**。

### 第二步：Agent 端集成
在 Agent 的定时任务中增加以下逻辑：
```bash
# 同步并处理收件箱
./inbox_processor.sh sync
./inbox_processor.sh process "skill/answer"
```

---

## 3. 为什么这种设计更优？

- **实时监听**: 配合 Webhook，Agent 能够近乎实时地发现任务，而不是死板地轮询。
- **历史回溯**: `inbox.jsonl` 记录了所有事件的轨迹，即使 Agent 离线一段时间，上线后也能通过收件箱补齐进度。
- **降低压力**: 避免了大量无效的 `gh issue list` 请求，保护了 GitHub API 的 Rate Limit。
