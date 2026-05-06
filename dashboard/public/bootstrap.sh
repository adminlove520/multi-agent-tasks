#!/bin/bash

# Agent Startup Helper: Fetch the latest protocol and identity
# Usage: ./bootstrap.sh <github_token> [skill_name]

TOKEN=$1
SKILL=${2:-"general"}
DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN is required."
  echo "Usage: ./bootstrap.sh <your_github_token> [skill_name]"
  exit 1
fi

echo "🔄 Bootstrapping agent ($SKILL) using Dashboard API..."

# 1. Fetch Global Protocol & Identity via Bootstrap API
# We pass the token to the API so it can fetch private repo content if needed
RESPONSE=$(curl -sSL "$DASHBOARD_URL/api/bootstrap?token=$TOKEN")

# Check if response is valid JSON and contains protocol
PROTOCOL=$(echo "$RESPONSE" | grep -o '"protocol":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROTOCOL" ]; then
  echo "❌ Error: Failed to fetch protocol. Response: $RESPONSE"
  exit 1
fi

# Decode JSON string (handle \n, \t etc) - simple version using printf
printf "%b" "$PROTOCOL" > "./PROTOCOL.md"

# 2. Download helper scripts
echo "📥 Downloading helper scripts..."
curl -sSL "$DASHBOARD_URL/inbox_processor.sh" -o "./inbox_processor.sh"
chmod +x "./inbox_processor.sh"

# 3. Create helper for discussions
# 升级 v3.2.1: 增强讨论辅助脚本
cat << 'EOF' > "./discussion_helper.sh"
#!/bin/bash
# Usage: ./discussion_helper.sh ask <issue_id> <peer_tag> <doubt>
ACTION=$1
if [ "$ACTION" == "ask" ]; then
  ISSUE_ID=$2
  PEER_TAG=$3
  DOUBT=$4
  # GraphQL based logic (Simplified for bootstrap)
  gh issue comment "$ISSUE_ID" --body "[$PEER_TAG]: 我在处理此任务时有疑问，已同步至 Discussions 探讨。疑问内容: $DOUBT"
  gh issue edit "$ISSUE_ID" --add-label "status/discussing"
fi
EOF
chmod +x "./discussion_helper.sh"

# 4. Get Agent Info from agents.json via Dashboard (Optional but helpful)
curl -sSL "$DASHBOARD_URL/api/agents?token=$TOKEN" -o "./agents_config.json"

# 5. Initialize Inbox directory
mkdir -p inbox
touch inbox/events.jsonl

echo "✅ System bound successfully."
echo "📜 Protocol saved to ./PROTOCOL.md"
echo "🤖 Agent config saved to ./agents_config.json"
echo "🛠️ Script saved to ./inbox_processor.sh"
echo "🚀 Agent is ready to process tasks from inbox."
echo "💡 Tip: Start processing with: ./inbox_processor.sh \$GITHUB_TOKEN \"$SKILL\" \"YourAgentName\""
