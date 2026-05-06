#!/bin/bash

# Multi-Agent Inbox Processor (v3.3.1)
# 核心功能：履约检测 (Fulfillment Check)，支持虚拟艾特识别与 Title 扫描

TOKEN=$1
MY_ROLE_LABEL=$2  # 例如: skill/answer
AGENT_NAME=$3     # 智能体名称 (如: 小溪)
AGENT_SLUG=$4     # 虚拟艾特识别名 (如: xiaoxi，不传则使用 AGENT_NAME 小写)

DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$TOKEN" ] || [ -z "$MY_ROLE_LABEL" ] || [ -z "$AGENT_NAME" ]; then
  echo "❌ Error: Missing parameters."
  echo "Usage: ./inbox_processor.sh <token> <role_label> <agent_name> [agent_slug]"
  exit 1
fi

# 基础变量设置
[ -z "$AGENT_SLUG" ] && AGENT_SLUG=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
IDENTITY_LABEL="agent/$AGENT_SLUG"
VIRTUAL_MENTION="@agent/${AGENT_SLUG}"

# 自动解析仓库信息
export GITHUB_TOKEN="$TOKEN"
REPO_FULL=$(gh repo view --json nameWithOwner --jq ".nameWithOwner")
OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)

echo "===================================================="
echo "🤖 Agent: $AGENT_NAME ($AGENT_SLUG) | Role: $MY_ROLE_LABEL"
echo "📦 Repo: $OWNER/$REPO_NAME"
echo "===================================================="

# 0. 并发锁保护
LOCKFILE="/tmp/agent_${AGENT_SLUG}.lock"
exec 200>$LOCKFILE
flock -n 200 || { echo "⚠️ Agent $AGENT_NAME is already running. Skipping."; exit 0; }

# 1. 增量更新 (如果是在 Git 仓库内)
if [ -d ".git" ]; then
  git fetch origin main >/dev/null 2>&1 && git reset --hard origin main >/dev/null 2>&1
fi

# 2. 注册活跃状态 (Heartbeat)
curl -s -X POST "$DASHBOARD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\", \"role\":\"$MY_ROLE_LABEL\", \"action\":\"heartbeat\"}" > /dev/null

# 3. 扫描逻辑 (GraphQL)
echo "🕵️ [3/4] Scanning Discussions..."

# 扫描最近的 10 个讨论，抓取标题、正文及最后 20 条评论
DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,url,body,comments(last:20){nodes{author{login},body}}}}}}'

gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" | jq -c "." | while read -r disc; do
  D_ID=$(echo "$disc" | jq -r '.id')
  D_NUM=$(echo "$disc" | jq -r '.number')
  D_TITLE=$(echo "$disc" | jq -r '.title')
  
  # 检查自己是否已发布过回复 (根据 [AgentName] 前缀判断)
  HAS_POSTED=$(echo "$disc" | jq -r ".comments.nodes[] | .body" | grep -F "[$AGENT_NAME]" | wc -l)
  
  # 检查是否包含实质性方案回复 (排除 ACK)
  HAS_REAL_REPLY=$(echo "$disc" | jq -r ".comments.nodes[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" | grep -v "\[ACK\]" | wc -l)
  
  # 检查是否被艾特 (包含 Title, Body, 和所有 Comments)
  IS_TAGGED=$(echo "$disc" | jq -r ".title, .body, .comments.nodes[].body" | grep -i "$VIRTUAL_MENTION" | wc -l)
  
  if [ "$HAS_POSTED" -eq "0" ] || [ "$HAS_REAL_REPLY" -eq "0" ] || [ "$IS_TAGGED" -gt "0" ]; then
     echo "------------------------------------------------"
     echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
     
     if [ "$HAS_POSTED" -eq "0" ]; then
       echo "👉 Action: Auto-replying initial ACK..."
       gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
         -f id="$D_ID" -f body="[$AGENT_NAME] [ACK]: 收到讨论邀请。我正在分析上下文，稍后给出方案。" >/dev/null
     elif [ "$HAS_REAL_REPLY" -eq "0" ]; then
       echo "🚨 PENDING DEBT: You only sent an ACK. You MUST provide a PROPOSAL now!"
     elif [ "$IS_TAGGED" -gt "0" ]; then
       echo "🔔 VIRTUAL MENTION DETECTED for $AGENT_NAME! Context required."
     fi
  fi
done

# 4. 扫描 Issues (任务区)
echo "🔍 [4/4] Scanning Issues..."
gh issue list --state open --json number,title,labels --limit 20 | jq -c ".[]" | while read -r issue; do
  I_NUM=$(echo "$issue" | jq -r '.number')
  I_TITLE=$(echo "$issue" | jq -r '.title')
  I_LABELS=$(echo "$issue" | jq -r '.labels[].name')
  
  if echo "$I_LABELS" | grep -qE "($MY_ROLE_LABEL|skill/all)"; then
    # 检查是否已包含实质性回复
    HAS_REAL_I_REPLY=$(gh issue view $I_NUM --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" | grep -v "\[ACK\]" | wc -l)
    
    if [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
      echo "📌 ISSUE #$I_NUM: $I_TITLE"
      # 执行锁定逻辑 (仅针对专属任务且未锁定的)
      IS_LOCKED=$(gh issue view $I_NUM --json labels --jq ".labels[] | select(.name | startswith(\"agent/\"))" | wc -l)
      if echo "$I_LABELS" | grep -q "$MY_ROLE_LABEL" && [ "$IS_LOCKED" -eq "0" ]; then
        echo "🔒 Claiming private task..."
        gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task"
        gh issue comment $I_NUM --body "[$AGENT_NAME]: 我已领取此任务。"
      fi
    fi
  fi
done

echo "===================================================="
echo "✅ Scan complete."
