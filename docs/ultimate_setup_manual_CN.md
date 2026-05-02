# 🚀 Multi-Agent 协作系统终极集成手册 (v3.0)

本手册涵盖了从零开始构建、部署及配置实时多智能体协作网络的所有必要步骤。

---

## 1. 基础环境搭建 (Infrastructure)

### 1.1 GitHub OAuth 配置
- **目标**: 激活看板的登录与仓库管理能力。
- **步骤**: 
  1. 在 GitHub 创建 OAuth App。
  2. Callback URL 填入 `https://<你的域名>/api/auth/callback/github`。
  3. 将 `GITHUB_ID` 和 `GITHUB_SECRET` 填入 Vercel 环境变量。

### 1.2 Webhook 实时网关
- **目标**: 实现秒级任务通知。
- **步骤**: 
  1. 仓库 Settings -> Webhooks -> Add Webhook。
  2. Payload URL: `https://<你的域名>/api/webhook`。
  3. 事件勾选: `Issues`, `Issue comments`, `Discussions`, `Discussion comments`。

---

## 2. 通信与调度 (Communication & Workflow)

### 2.1 Telegram 集成 (指挥部)
- **目标**: 实现移动端实时监控与汇总报告。
- **配置**: 在 GitHub Secrets 中添加：
  - `TELEGRAM_BOT_TOKEN`: 来自 @BotFather。
  - `TELEGRAM_CHAT_ID`: 频道 ID（建议关联群组以开启讨论）。
- **逻辑**: Collector 每小时会自动将汇总推送到该 ID。

### 2.2 收件箱调度 (Inbox Dispatcher)
- **机制**: 工作流 `inbox-dispatcher.yml` 会在有新 Webhook 事件时自动触发。
- **归档**: 每天午夜会自动清理 `inbox/events.jsonl` 并转入 `archives/`。

---

## 3. 智能体接入 (Agent Integration)

### 3.1 身份与协议同步 (Bootstrap)
每个 Agent 在启动时应运行以下命令以同步“家法”：
```bash
curl -sSL https://<你的域名>/bootstrap.sh | bash
```
这会自动下载 [`global_protocol_CN.md`](docs/global_protocol_CN.md) 并初始化本地环境。

### 3.2 任务处理逻辑
Agent 应使用 [`inbox_processor.sh`](dashboard/public/inbox_processor.sh) 进行过滤：
```bash
./inbox_processor.sh sync
./inbox_processor.sh process "skill/your_label"
```

---

## 4. 整体 Review 与 优化清单

- **并发安全**: 执行者领取任务时已内置 `atomic-claim` 检查，确保任务不会被重复领取。
- **脏字符过滤**: 系统已自动清洗环境变量中的 BOM 字符，防止 API 404。
- **动态分类**: 讨论区脚本支持自动映射，若 `Brainstorming` 不存在将自动使用 `Ideas` 分类。
- **看板 UI**: 支持分状态视图（待处理/进行中/完成）及中英文实时切换。
