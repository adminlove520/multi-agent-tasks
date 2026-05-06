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

# 4.1 扫描任务 (包含专属任务 和 全员广播)
# 使用逗号分隔标签表示 AND，我们需要分别拉取再合并，或者拉取所有 task 再过滤
echo "🔍 Searching for $MY_ROLE_LABEL OR skill/all tasks..."

gh issue list --label "task" --state open --json number,title,labels --limit 20 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  LABELS=$(echo "$issue" | jq -r '.labels[].name')
  
  # 判断是否匹配角色或全员广播
  MATCH=0
  if echo "$LABELS" | grep -q "$MY_ROLE_LABEL"; then MATCH=1; fi
  if echo "$LABELS" | grep -q "skill/all"; then MATCH=1; fi
  
  if [ "$MATCH" -eq "1" ]; then
    # 原子锁定检查
    IS_CLAIMED_BY_ME=$(gh issue view $NUMBER --json labels --jq ".labels[] | select(.name == \"$IDENTITY_LABEL\")" | wc -l)
    
    if [ "$IS_CLAIMED_BY_ME" -eq "0" ]; then
      echo "------------------------------------------------"
      echo "🚨 NEW TASK/BROADCAST #$NUMBER: $TITLE"
      
      # 如果是全员广播，自动回复 ACK 并添加身份标签
      if echo "$LABELS" | grep -q "skill/all"; then
        echo "📢 Global Broadcast detected. Auto-ACKing..."
        gh issue edit $NUMBER --add-label "$IDENTITY_LABEL"
        gh issue comment $NUMBER --body "[$AGENT_NAME] [ACK]: 收到全员指令，正在同步执行。"
      else
        # 如果是专属任务，正常锁定
        echo "📌 Claiming Private Task..."
        gh issue edit $NUMBER --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task"
        gh issue comment $NUMBER --body "[$AGENT_NAME]: 🔒 任务已锁定，正在执行。"
      fi
    else
      echo "✅ Task #$NUMBER already acknowledged by $AGENT_NAME."
    fi
  fi
done


echo "===================================================="
echo "✅ Scan complete. If no tasks found, standby or check Discussions."
