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
echo "===================================================="

# 1. 增量拉取代码
echo "🔄 [1/3] Syncing latest data from GitHub..."
git fetch origin main
git reset --hard origin main  # 强制同步远程，确保 inbox/events.jsonl 为最新

# 2. 扫描 Webhook 缓存 (如果有)
if [ -f "$INBOX_FILE" ]; then
  echo "🔍 [2/3] Checking recent Webhook events..."
  MATCHES=$(grep "$MY_ROLE_LABEL" "$INBOX_FILE" | tail -n 5)
  if [ ! -z "$MATCHES" ]; then
    echo "🔔 Recent matching events found in inbox:"
    echo "$MATCHES" | jq -r '"• [\(.action)] \(.title) -> \(.url)"'
  fi
fi

# 3. 深度实时扫描 (作为兜底)
echo "🕵️ [3/3] Scanning real-time Issues list..."
gh issue list --label "$MY_ROLE_LABEL" --label "task" --state open --json number,title,url --limit 10 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  URL=$(echo "$issue" | jq -r '.url')
  
  echo "------------------------------------------------"
  echo "📌 AVAILABLE TASK #$NUMBER: $TITLE"
  echo "🔗 $URL"
  echo "👉 Action: Run 'gh issue edit $NUMBER --add-label \"task/processing,$IDENTITY_LABEL\" --remove-label \"task\"' to claim."
done

echo "===================================================="
echo "✅ Scan complete. If no tasks found, standby or check Discussions."
