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

# 4. 深度实时扫描 (Atomic Locking 增强)
echo "🕵️ [4/4] Scanning real-time Issues list..."

# 4.1 扫描任务 (包含专属任务、全员广播、讨论话题)
echo "🔍 Searching for $MY_ROLE_LABEL, skill/all, OR status/discussing..."

gh issue list --state open --json number,title,labels --limit 20 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  LABELS=$(echo "$issue" | jq -r '.labels[].name')
  
  # 判断是否匹配角色、全员广播 或 讨论状态
  MATCH=0
  if echo "$LABELS" | grep -q "$MY_ROLE_LABEL"; then MATCH=1; fi
  if echo "$LABELS" | grep -q "skill/all"; then MATCH=1; fi
  if echo "$LABELS" | grep -q "status/discussing"; then MATCH=1; fi
  
  if [ "$MATCH" -eq "1" ]; then
    echo "------------------------------------------------"
    echo "🚨 TARGET FOUND #$NUMBER: $TITLE"
    
    # 获取最近 5 条讨论内容，为 Agent 提供背景
    echo "💬 Recent Comments Context:"
    gh issue view $NUMBER --json comments --jq ".comments[-5:] | .[] | \"- [\(.author.login)]: \(.body)\"" || echo "(No comments yet)"

    # 检查是否已经 ACK 过 (对于广播或讨论)
    IS_PARTICIPATED=$(gh issue view $NUMBER --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME]\"))" | wc -l)
    
    if [ "$IS_PARTICIPATED" -eq "0" ]; then
      if echo "$LABELS" | grep -q "status/discussing"; then
        echo "🗣️ Discussion active. Agent participation required!"
        # 这里由 Agent 自身的 AI 逻辑决定回复内容，此处仅作脚本层提示
      elif echo "$LABELS" | grep -q "skill/all"; then
        echo "📢 Global Broadcast. Auto-ACKing..."
        gh issue edit $NUMBER --add-label "$IDENTITY_LABEL"
        gh issue comment $NUMBER --body "[$AGENT_NAME] [ACK]: 收到指令，正在同步执行。"
      else
        echo "📌 Claiming Private Task..."
        gh issue edit $NUMBER --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task"
        gh issue comment $NUMBER --body "[$AGENT_NAME]: 🔒 任务已锁定，正在执行。"
      fi
    else
      echo "✅ Already participated in #$NUMBER."
    fi
  fi
done


echo "===================================================="
echo "✅ Scan complete. If no tasks found, standby or check Discussions."
