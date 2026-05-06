#!/bin/bash

# Multi-Agent Inbox Processor (v3.2)
# 专注于“轮询+增量同步”模式，适配非持续运行的 Agent

TOKEN=$1
MY_ROLE_LABEL=$2  # 例如: skill/answer
AGENT_NAME=$3     # 智能体名称 (如: 小隐)

DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"
INBOX_FILE="inbox/events.jsonl"

if [ -z "$TOKEN" ] || [ -z "$MY_ROLE_LABEL" ] || [ -z "$AGENT_NAME" ]; then
  echo "❌ Error: Missing parameters."
  echo "Usage: ./inbox_processor.sh <token> <role_label> <agent_name>"
  exit 1
fi

AGENT_NAME_LOWER=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
IDENTITY_LABEL="agent/$AGENT_NAME_LOWER"

echo "===================================================="
echo "🤖 Agent Identity: $AGENT_NAME ($IDENTITY_LABEL)"
echo "📡 Role Focus: $MY_ROLE_LABEL"
# 0. 并发锁保护 (Concurrency Lock)
# 防止定时任务重叠执行
LOCKFILE="/tmp/agent_${AGENT_NAME_LOWER}.lock"
exec 200>$LOCKFILE
flock -n 200 || { echo "⚠️ Agent $AGENT_NAME is already running. Skipping this cycle."; exit 0; }

# 0.1 依赖检查
command -v jq >/dev/null 2>&1 || { echo "❌ Error: 'jq' is not installed."; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ Error: 'gh' CLI is not installed."; exit 1; }

echo "===================================================="

# 1. 增量拉取代码与长效记忆同步
echo "🔄 [1/4] Syncing latest data & memory..."
git fetch origin main
git reset --hard origin main

# 同步讨论区记忆 (Memory Sync)
echo "🧠 Syncing group memory from Discussions..."
gh discussion list --category "Brainstorming" --limit 10 --json title,body,comments > "inbox/group_memory.json"

# 2. 注册活跃状态 (Heartbeat/Webhook Accelerator)
echo "💓 [2/4] Sending heartbeat to dashboard..."
curl -s -X POST "$DASHBOARD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\", \"role\":\"$MY_ROLE_LABEL\", \"action\":\"heartbeat\"}" > /dev/null

# 3. 扫描 Webhook 缓存
# ... (existing code)

# 4. 深度实时扫描 (v3.2.6 - GraphQL 增强版)
echo "🕵️ [4/4] Scanning real-time Issues & Discussions..."

# 4.1 扫描 GitHub Discussions (脑暴区)
echo "🗣️ Checking GitHub Discussions via GraphQL..."
DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:5,orderBy:{field:CREATED_AT,direction:DESC}){nodes{number,title,url,body,comments(last:3){nodes{author{login},body}}}}}}'
gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" | jq -c "." | while read -r disc; do
  NUMBER=$(echo "$disc" | jq -r '.number')
  TITLE=$(echo "$disc" | jq -r '.title')
  
  echo "------------------------------------------------"
  echo "🗣️ ACTIVE DISCUSSION #$NUMBER: $TITLE"
  
  # 检查 Agent 是否已参与 或 被虚拟 @
  VIRTUAL_MENTION="@agent/${AGENT_NAME_LOWER}"
  IS_MENTIONED=$(echo "$disc" | jq -r ".comments.nodes[] | .body" | grep -i "$VIRTUAL_MENTION" | wc -l)
  IS_PARTICIPATED=$(echo "$disc" | jq -r ".comments.nodes[] | select(.author.login == \"$AGENT_NAME\")" | wc -l)
  
  if [ "$IS_MENTIONED" -gt "0" ] || [ "$IS_PARTICIPATED" -eq "0" ]; then
    echo "👉 [ACTION REQUIRED] Participant or Mentioned: $AGENT_NAME"
    if [ "$IS_MENTIONED" -gt "0" ]; then
       echo "🔔 VIRTUAL MENTION DETECTED: $VIRTUAL_MENTION"
    fi
    # 打印上下文
    echo "💬 Recent Context:"
    echo "$disc" | jq -r '.comments.nodes[] | "- [\(.author.login)]: \(.body)"'
  else
    echo "✅ No new mentions for $AGENT_NAME in #$NUMBER."
  fi
done

# 4.2 扫描 Issues (任务区)
# ... (rest of the issue scanning logic)


echo "===================================================="
echo "✅ Scan complete. If no tasks found, standby or check Discussions."
