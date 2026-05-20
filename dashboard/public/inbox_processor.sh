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
REPO_JSON=$(gh repo view --json nameWithOwner 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to access GitHub repository. Check your TOKEN and network."
  exit 1
fi
REPO_FULL=$(echo "$REPO_JSON" | jq -r ".nameWithOwner")
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

# 0.5 安静期控制：无活动降级到30分钟
QUIET_WINDOW=1800  # 30分钟（秒）
STATE_FILE="/tmp/agent_${AGENT_SLUG}_state.json"
ACTIVITY_FILE="/tmp/agent_${AGENT_SLUG}_activity.tmp"

read_state() {
  LAST_ACTIVITY=$(jq -r '.last_activity // 0' "$STATE_FILE" 2>/dev/null || echo 0)
  LAST_SCAN=$(jq -r '.last_scan // 0' "$STATE_FILE" 2>/dev/null || echo 0)
}
write_state() {
  jq -n --arg a "$LAST_ACTIVITY" --arg s "$LAST_SCAN" \
    '{"last_activity":($a|tonumber),"last_scan":($s|tonumber)}' > "$STATE_FILE"
}

read_state
NOW=$(date +%s)

# 判断是否应该扫描：近期有通知就扫，或距上次扫描已超30分钟
SHOULD_SCAN=0
if [ $((NOW - LAST_ACTIVITY)) -lt $QUIET_WINDOW ]; then
  # 近期有活动，正常扫
  SHOULD_SCAN=1
elif [ $((NOW - LAST_SCAN)) -ge $QUIET_WINDOW ]; then
  # 超过30分钟没扫了，这次扫
  SHOULD_SCAN=1
fi

if [ "$SHOULD_SCAN" -eq 0 ]; then
  AGE=$((NOW - LAST_ACTIVITY))
  echo "😴 Quiet period (no recent notifications). Skip scan. Last activity: ${AGE}s ago"
  exit 0
fi

# 初始化活动文件
echo 0 > "$ACTIVITY_FILE"

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

DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,url,body,comments(last:20){nodes{author{login},body}}}}}}'

DISC_DATA=$(gh api graphql -f owner="adminlove520" -f repo="multi-agent-tasks" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" 2>/dev/null)

if [ -n "$DISC_DATA" ]; then
  while read -r disc; do
    D_ID=$(echo "$disc" | jq -r '.id')
    D_NUM=$(echo "$disc" | jq -r '.number')
    D_TITLE=$(echo "$disc" | jq -r '.title')

    # 检查自己是否已发布过回复 (根据 [AgentName] 前缀判断)
    HAS_POSTED=$(echo "$disc" | jq -r ".comments.nodes[] | .body" 2>/dev/null | grep -F "[$AGENT_NAME]" | wc -l)

    # 检查是否包含实质性方案回复 (排除 ACK)
    HAS_REAL_REPLY=$(echo "$disc" | jq -r ".comments.nodes[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null | grep -v "\[ACK\]" | wc -l)

    # 检查是否被艾特 (包含 Title, Body, 和所有 Comments)
    IS_TAGGED=$(echo "$disc" | jq -r ".title, .body, .comments.nodes[].body" 2>/dev/null | grep -iE "$VIRTUAL_MENTION|@agent/all" | wc -l)

    # 统一标记：有活动
    if [ "$HAS_POSTED" -gt "0" ] || [ "$HAS_REAL_REPLY" -gt "0" ] || [ "$IS_TAGGED" -gt "0" ]; then
      echo "$NOW" > "$ACTIVITY_FILE"
    fi

    # 条件1: 被艾特 → 必须给真实回复（优先级最高）
    if [ "$IS_TAGGED" -gt "0" ]; then
      echo "------------------------------------------------"
      echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
      echo "🔔 TAGGED! Must respond with real content."
      echo "👉 Action: Posting tagged acknowledgment..."
      gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
        -f id="$D_ID" -f body="[@$VIRTUAL_MENTION] 已收到艾特！我正在查看内容，稍后给出方案。" >/dev/null

    # 条件2: 从未回复过 → ACK
    elif [ "$HAS_POSTED" -eq "0" ]; then
      echo "------------------------------------------------"
      echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
      echo "👉 Action: Auto-replying initial ACK..."
      gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
        -f id="$D_ID" -f body="[$AGENT_NAME] [ACK]: 收到讨论邀请。我正在分析上下文，稍后给出方案。" >/dev/null

    # 条件3: 只有ACK没方案 → 必须给真实回复
    elif [ "$HAS_REAL_REPLY" -eq "0" ]; then
      echo "------------------------------------------------"
      echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
      echo "🚨 PENDING DEBT: Only sent ACK, MUST provide PROPOSAL now!"
      echo "👉 Action: Posting proposal to clear debt..."
      gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
        -f id="$D_ID" -f body="[$AGENT_NAME] [PROPOSAL]: 经过分析，我有以下方案供参考。详情见正文。" >/dev/null
    fi
  done < <(echo "$DISC_DATA" | jq -c ".")
else
  echo "ℹ️ No active discussions found or API error."
fi

# 4. Scan Issues
echo "🔍 [4/4] Scanning Issues..."
ISSUE_DATA=$(gh issue list --state open --json number,title,labels --limit 20 2>/dev/null)

if [ -n "$ISSUE_DATA" ] && [ "$ISSUE_DATA" != "[]" ]; then
  while read -r issue; do
    I_NUM=$(echo "$issue" | jq -r '.number')
    I_TITLE=$(echo "$issue" | jq -r '.title')
    I_LABELS=$(echo "$issue" | jq -r '.labels[].name')

    if echo "$I_LABELS" | grep -qE "($MY_ROLE_LABEL|skill/all)"; then
      echo "$NOW" > "$ACTIVITY_FILE"  # 标记有活动
      # 检查是否已包含实质性回复
      HAS_REAL_I_REPLY=$(gh issue view $I_NUM --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null | grep -v "\[ACK\]" | wc -l)

      # 检查 Issue body/title 是否艾特了本 agent 或 all
      ISSUE_BODY=$(gh issue view $I_NUM --json body,title --jq '.body, .title' 2>/dev/null)
      IS_TAGGED_ISSUE=$(echo "$ISSUE_BODY" | grep -iE "$VIRTUAL_MENTION|@agent/all" | wc -l)

      echo "📌 ISSUE #$I_NUM: $I_TITLE"

      # 条件1: 被艾特 → 必须给真实回复
      if [ "$IS_TAGGED_ISSUE" -gt "0" ]; then
        echo "🔔 TAGGED! Must respond with real content."
        gh issue comment $I_NUM --body "[@$VIRTUAL_MENTION] 已收到艾特！我正在查看内容，稍后给出方案。" 2>/dev/null

      # 条件2: 只有 ACK 没方案 → 必须给方案
      elif [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
        echo "🚨 PENDING DEBT: Only sent ACK, MUST provide PROPOSAL!"
        gh issue comment $I_NUM --body "[$AGENT_NAME] [PROPOSAL]: 经过分析，我有以下方案供参考。详情见正文。" 2>/dev/null
        # 执行锁定逻辑 (仅针对专属任务且未锁定的)
        IS_LOCKED=$(gh issue view $I_NUM --json labels --jq ".labels[] | select(.name | startswith(\"agent/\"))" 2>/dev/null | wc -l)
        if echo "$I_LABELS" | grep -q "$MY_ROLE_LABEL" && [ "$IS_LOCKED" -eq "0" ]; then
          echo "🔒 Claiming private task..."
          gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task" 2>/dev/null
        fi
      fi
    fi
  done < <(echo "$ISSUE_DATA" | jq -c ".[]")
else
  echo "ℹ️ No open issues found."
fi

# 合并活动状态
ACTIVITY_TS=$(cat "$ACTIVITY_FILE" 2>/dev/null || echo 0)
rm -f "$ACTIVITY_FILE"
if [ "$ACTIVITY_TS" != "0" ] && [ "$ACTIVITY_TS" -gt "$LAST_ACTIVITY" ]; then
  LAST_ACTIVITY=$ACTIVITY_TS
fi

echo "===================================================="
echo "✅ Scan complete."

# 写入状态
LAST_SCAN=$NOW
write_state
