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

# 1. 增量拉取代码与长效记忆同步
echo "🔄 [1/4] Syncing latest data & memory..."
git fetch origin main
git reset --hard origin main

# 同步讨论区记忆 (Memory Sync)
echo "🧠 Syncing group memory from Discussions..."
gh discussion list --category "Brainstorming" --limit 10 --json title,body,comments > "inbox/group_memory.json"

# 2. 注册活跃状态 (Heartbeat/Webhook Accelerator)
# 告诉 Dashboard 这一台 Agent 正在线，准备接收 Webhook 实时通知（如果环境允许）
# curl -s -X POST "$DASHBOARD_URL/api/agents/heartbeat" -d "name=$AGENT_NAME&role=$MY_ROLE_LABEL" > /dev/null

# 3. 扫描 Webhook 缓存
# ... (existing code)

# 4. 深度实时扫描 (Atomic Locking 增强)
echo "🕵️ [4/4] Scanning real-time Issues list..."

# 4.1 扫描专属任务
gh issue list --label "$MY_ROLE_LABEL" --label "task" --state open --json number,title,url --limit 10 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  
  # 原子锁定检查：检查是否已被锁定或已有人开始评论
  IS_LOCKED=$(gh issue view $NUMBER --json labels --jq ".labels[] | select(.name | startswith(\"agent/\"))" | wc -l)
  
  if [ "$IS_LOCKED" -eq "0" ]; then
    echo "------------------------------------------------"
    echo "📌 CLAIMING TASK #$NUMBER: $TITLE"
    # 原子锁定：立即添加身份标签并留言
    gh issue edit $NUMBER --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task"
    gh issue comment $NUMBER --body "[$AGENT_NAME]: 🔒 任务已锁定，正在根据最新的 PROTOCOL.md 执行。如有疑问将转向 Discussions。"
    
    # 这里进入实际执行逻辑...
  else
    echo "⏭️ Skipping Task #$NUMBER (Already claimed by another agent)"
  fi
done


# 3.2 扫描全员广播 (Broadcast)
echo "📢 Checking for global broadcasts..."
gh issue list --label "skill/all" --label "task" --state open --json number,title,url --limit 5 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  
  # 检查是否已经 ACK 过
  ALREADY_ACK=$(gh issue view $NUMBER --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME] [ACK]\"))" | wc -l)
  
  if [ "$ALREADY_ACK" -eq "0" ]; then
    echo "------------------------------------------------"
    echo "🚨 NEW BROADCAST #$NUMBER: $TITLE"
    echo "👉 Auto-ACKing for $AGENT_NAME..."
    gh issue comment $NUMBER --body "[$AGENT_NAME] [ACK]: 收到全员指令，正在同步执行。"
  fi
done

echo "===================================================="
echo "✅ Scan complete. If no tasks found, standby or check Discussions."
