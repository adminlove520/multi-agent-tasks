#!/bin/bash

# Multi-Agent Inbox Processor (v3.2.8)
# 修复变量定义、自动回复逻辑、Git 依赖及广播扫描

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

# 基础变量设置
AGENT_NAME_LOWER=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
IDENTITY_LABEL="agent/$AGENT_NAME_LOWER"
VIRTUAL_MENTION="@agent/${AGENT_NAME_LOWER}"

# 自动解析仓库信息 (修复 $OWNER/$REPO_NAME 未定义问题)
if ! command -v gh >/dev/null 2>&1; then
  echo "❌ Error: 'gh' CLI is not installed."
  exit 1
fi

export GITHUB_TOKEN="$TOKEN"
REPO_FULL=$(gh repo view --json nameWithOwner --jq ".nameWithOwner")
OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)

echo "===================================================="
echo "🤖 Agent: $AGENT_NAME | Role: $MY_ROLE_LABEL"
echo "📦 Repo: $OWNER/$REPO_NAME"
echo "===================================================="

# 0. 并发锁保护
LOCKFILE="/tmp/agent_${AGENT_NAME_LOWER}.lock"
exec 200>$LOCKFILE
flock -n 200 || { echo "⚠️ Agent $AGENT_NAME is already running. Skipping."; exit 0; }

# 1. 增量更新与记忆同步 (修复 Git 仓库检查)
echo "🔄 [1/4] Syncing memory..."
if [ -d ".git" ]; then
  git fetch origin main >/dev/null 2>&1 && git reset --hard origin main >/dev/null 2>&1
fi

# 强制同步讨论区上下文
gh discussion list --limit 10 --json title,body,comments > "inbox/group_memory.json" 2>/dev/null

# 2. 注册活跃状态 (Heartbeat)
echo "💓 [2/4] Sending heartbeat..."
curl -s -X POST "$DASHBOARD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\", \"role\":\"$MY_ROLE_LABEL\", \"action\":\"heartbeat\"}" > /dev/null

# 3. 扫描逻辑 (GraphQL)
echo "🕵️ [3/4] Scanning Discussions & Broadcasts..."

# 3.1 扫描 Discussions
DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,url,body,comments(last:20){nodes{author{login},body}}}}}}'

gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" | jq -c "." | while read -r disc; do
  D_ID=$(echo "$disc" | jq -r '.id')
  D_NUM=$(echo "$disc" | jq -r '.number')
  D_TITLE=$(echo "$disc" | jq -r '.title')
  
  # 检查是否已参与过 (通过检查评论中是否包含 [AgentName])
  HAS_POSTED=$(echo "$disc" | jq -r ".comments.nodes[] | .body" | grep -F "[$AGENT_NAME]" | wc -l)
  # 检查是否被艾特
  IS_TAGGED=$(echo "$disc" | jq -r ".body, (.comments.nodes[].body)" | grep -i "$VIRTUAL_MENTION" | wc -l)
  
  if [ "$IS_TAGGED" -gt "0" ] || [ "$HAS_POSTED" -eq "0" ]; then
     echo "------------------------------------------------"
     echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
     
     if [ "$HAS_POSTED" -eq "0" ]; then
       echo "👉 Action: Auto-replying initial ACK..."
       # 这里由 Agent AI 逻辑生成实际回复，此处脚本代为回复 ACK 占位
       gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
         -f id="$D_ID" -f body="[$AGENT_NAME] [ACK]: 收到讨论邀请。我正在分析上下文，稍后给出方案。@agent/all" >/dev/null
     fi
  fi
done

# 3.2 扫描 Issues (专属任务 & 全员广播)
echo "🔍 [4/4] Scanning Issues..."
gh issue list --state open --json number,title,labels --limit 20 | jq -c ".[]" | while read -r issue; do
  I_NUM=$(echo "$issue" | jq -r '.number')
  I_TITLE=$(echo "$issue" | jq -r '.title')
  I_LABELS=$(echo "$issue" | jq -r '.labels[].name')
  
  # 匹配逻辑：角色标签 OR skill/all
  if echo "$I_LABELS" | grep -qE "($MY_ROLE_LABEL|skill/all)"; then
    # 检查是否已 ACK
    ACKED=$(gh issue view $I_NUM --json comments --jq ".comments[].body" | grep -F "[$AGENT_NAME] [ACK]" | wc -l)
    
    if [ "$ACKED" -eq "0" ]; then
      echo "📌 ISSUE #$I_NUM: $I_TITLE"
      if echo "$I_LABELS" | grep -q "skill/all"; then
        echo "📢 Global Broadcast. Sending ACK..."
        gh issue comment $I_NUM --body "[$AGENT_NAME] [ACK]: 收到广播指令，正在执行。"
      else
        echo "🔒 Claiming private task..."
        gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task"
        gh issue comment $I_NUM --body "[$AGENT_NAME]: 我已领取此任务。"
      fi
    fi
  fi
done

echo "===================================================="
echo "✅ Scan complete."
