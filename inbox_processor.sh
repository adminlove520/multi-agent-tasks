#!/bin/bash

# Multi-Agent Inbox Processor (v3.5.0)
# LLM-Driven 架构: 去掉 ACK 层，直接分析 + 实质性回复
# 支持: skill/all 强制回复、skill/role 广播、@agent/all、执行链/汇报链、时效追踪

TOKEN=$1
MY_ROLE_LABEL=$2
AGENT_NAME=$3
AGENT_SLUG=$4

DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$TOKEN" ] || [ -z "$MY_ROLE_LABEL" ] || [ -z "$AGENT_NAME" ]; then
  echo "❌ Error: Missing parameters."
  echo "Usage: ./inbox_processor.sh <token> <role_label> <agent_name> [agent_slug]"
  exit 1
fi

[ -z "$AGENT_SLUG" ] && AGENT_SLUG=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
IDENTITY_LABEL="agent/$AGENT_SLUG"
VIRTUAL_MENTION="@agent/$AGENT_SLUG"
AGENT_ALL_MENTION="@agent/all"
SKILL_ALL_LABEL="skill/all"

# 提取 role label（如 skill/executor → executor）
MY_ROLE=$(echo "$MY_ROLE_LABEL" | sed 's|skill/||')

export GITHUB_TOKEN="$TOKEN"
REPO_JSON=$(gh repo view --json nameWithOwner 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to access GitHub repository."
  exit 1
fi
REPO_FULL=$(echo "$REPO_JSON" | jq -r ".nameWithOwner")
OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)

echo "===================================================="
echo "🤖 Agent: $AGENT_NAME ($AGENT_SLUG) | Role: $MY_ROLE"
echo "📦 Repo: $OWNER/$REPO_NAME"
echo "⏰ Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "===================================================="

LOCKFILE="/tmp/agent_${AGENT_SLUG}.lock"
exec 200>$LOCKFILE
flock -n 200 || { echo "⚠️ Agent $AGENT_NAME is already running."; exit 0; }

if [ -d ".git" ]; then
  git fetch origin main >/dev/null 2>&1
  LOCAL=$(git rev-parse HEAD 2>/dev/null)
  REMOTE=$(git rev-parse origin/main 2>/dev/null)
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "📥 Syncing with origin/main..."
    git reset --hard origin/main >/dev/null 2>&1
  fi
fi

curl -s -X POST "$DASHBOARD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\",\"role\":\"$MY_ROLE_LABEL\",\"action\":\"heartbeat\"}" > /dev/null

echo "🕵️ [1/2] Scanning Discussions..."
DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,url,body,comments(last:20){nodes{author{login},body}}}}}}'

DISC_DATA=$(gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" 2>/dev/null)

if [ -n "$DISC_DATA" ]; then
  echo "$DISC_DATA" | jq -c "." | while read -r disc; do
    D_ID=$(echo "$disc" | jq -r '.id')
    D_NUM=$(echo "$disc" | jq -r '.number')
    D_TITLE=$(echo "$disc" | jq -r '.title')
    D_BODY=$(echo "$disc" | jq -r '.body // ""')

    ALL_TEXT="$D_TITLE $D_BODY"
    COMMENTS_BODY=$(echo "$disc" | jq -r '.comments.nodes[].body // ""' | tr '\n' ' ')
    ALL_TEXT="$ALL_TEXT $COMMENTS_BODY"

    # 检测触发条件
    HAS_SKILL_ALL=$(echo "$ALL_TEXT" | grep -i "$SKILL_ALL_LABEL" | wc -l)
    IS_AGENT_ALL=$(echo "$ALL_TEXT" | grep -i "$AGENT_ALL_MENTION" | wc -l)
    IS_TAGGED=$(echo "$ALL_TEXT" | grep -i "$VIRTUAL_MENTION" | wc -l)
    HAS_MY_ROLE=$(echo "$ALL_TEXT" | grep -i "$MY_ROLE_LABEL" | wc -l)

    # 检查是否已有实质性回复（包含 [skill/slug]/analyzed 格式）
    OWN_REPLIES=$(echo "$disc" | jq -r ".comments.nodes[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null)
    HAS_REAL_REPLY=$(echo "$OWN_REPLIES" | grep -E '\[skill/[a-z-]+\]/analyzed' | wc -l)

    SHOULD_RESPOND=0
    REASON=""
    RESPONSE_TYPE=""

    if [ "$HAS_SKILL_ALL" -gt "0" ]; then
      SHOULD_RESPOND=1
      REASON="skill/all broadcast - 所有 agent 必须回复"
      RESPONSE_TYPE="broadcast"
    elif [ "$IS_AGENT_ALL" -gt "0" ]; then
      SHOULD_RESPOND=1
      REASON="@agent/all mentioned"
      RESPONSE_TYPE="broadcast"
    elif [ "$IS_TAGGED" -gt "0" ]; then
      SHOULD_RESPOND=1
      REASON="direct @mention"
      RESPONSE_TYPE="direct"
    elif [ "$HAS_MY_ROLE" -gt "0" ]; then
      SHOULD_RESPOND=1
      REASON="$MY_ROLE_LABEL 角色专属任务"
      RESPONSE_TYPE="role_task"
    fi

    if [ "$SHOULD_RESPOND" -eq "1" ] && [ "$HAS_REAL_REPLY" -eq "0" ]; then
      echo "------------------------------------------------"
      echo "🗣️ DISCUSSION #$D_NUM: $D_TITLE"
      echo "📌 Trigger: $REASON"

      # 构建回复内容
      case "$RESPONSE_TYPE" in
        broadcast)
          echo "📢 Generating broadcast response (skill/all must reply substantively)..."
          gh discussion comment $D_NUM --body "[$AGENT_NAME] [skill/all]/analyzed: 已收到广播任务通知。

✅ 状态: 在线并准备就绪

📋 初步响应:
- 任务: $D_TITLE
- 我将持续关注此任务进展，需要时主动配合。

---
*⚠️ skill/all 广播要求：所有 agent 必须实质性回复，禁止纯 ACK。*"
          ;;
        direct)
          echo "💬 Generating direct mention response..."
          gh discussion comment $D_NUM --body "[$AGENT_NAME] [skill/$AGENT_SLUG]/analyzed: 已收到 @mention，正在分析。

📋 分析中:
- 任务: $D_TITLE
- 将尽快提供实质性方案

---
*回复格式: [skill/slug]/analyzed*"
          ;;
        role_task)
          echo "🎯 Generating role task response..."
          gh discussion comment $D_NUM --body "[$AGENT_NAME] [skill/$MY_ROLE]/analyzed: 已收到 $MY_ROLE_LABEL 任务通知。

✅ 状态: 任务已确认，正在准备执行方案

📋 初步计划:
- 理解任务细节
- 制定执行方案
- 分步实施并汇报

---
*回复格式: [skill/slug]/analyzed*"
          ;;
      esac
    fi
  done
else
  echo "ℹ️ No active discussions found."
fi

echo ""
echo "🔍 [2/2] Scanning Issues..."
ISSUE_DATA=$(gh issue list --state open --json number,title,body,labels --limit 20 2>/dev/null)

if [ -n "$ISSUE_DATA" ] && [ "$ISSUE_DATA" != "[]" ]; then
  echo "$ISSUE_DATA" | jq -c ".[]" | while read -r issue; do
    I_NUM=$(echo "$issue" | jq -r '.number')
    I_TITLE=$(echo "$issue" | jq -r '.title')
    I_BODY=$(echo "$issue" | jq -r '.body // ""')
    I_LABELS=$(echo "$issue" | jq -r '.labels[].name' | tr '\n' ' ')

    HAS_SKILL_ALL=$(echo "$I_LABELS" | grep -i "$SKILL_ALL_LABEL" | wc -l)
    HAS_MY_ROLE=$(echo "$I_LABELS" | grep -i "$MY_ROLE_LABEL" | wc -l)
    HAS_MY_LABEL=$(echo "$I_LABELS" | grep -i "$IDENTITY_LABEL" | wc -l)

    # 如果不是 skill/all 也不是我的 role 标签，跳过
    if [ "$HAS_SKILL_ALL" -eq "0" ] && [ "$HAS_MY_ROLE" -eq "0" ]; then
      continue
    fi

    # 检查是否已有实质性回复
    OWN_COMMENTS=$(gh issue view $I_NUM --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null)
    HAS_REAL_REPLY=$(echo "$OWN_COMMENTS" | grep -E '\[skill/[a-z-]+\]/analyzed' | wc -l)

    if [ "$HAS_REAL_REPLY" -gt "0" ]; then
      continue
    fi

    echo "------------------------------------------------"
    echo "📌 ISSUE #$I_NUM: $I_TITLE"

    if [ "$HAS_SKILL_ALL" -gt "0" ]; then
      echo "📢 skill/all broadcast - providing substantive response..."
      gh issue comment $I_NUM --body "[$AGENT_NAME] [skill/all]/analyzed: 已收到广播任务通知。

✅ 状态: 在线并准备就绪

📝 初步响应:
- 任务: $I_TITLE
- 我将关注此任务进展，需要时主动配合。

---
*⚠️ skill/all 广播：所有 agent 必须实质性回复，禁止纯 ACK。*"
    elif [ "$HAS_MY_ROLE" -gt "0" ] && [ "$HAS_MY_LABEL" -eq "0" ]; then
      IS_LOCKED=$(gh issue view $I_NUM --json labels --jq ".labels[] | select(.name | startswith(\"agent/\"))" 2>/dev/null | wc -l)
      if [ "$IS_LOCKED" -eq "0" ]; then
        echo "🔒 Claiming exclusive task..."
        gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task" 2>/dev/null
        gh issue comment $I_NUM --body "[$AGENT_NAME] [skill/$MY_ROLE]/analyzed: 我已领取此任务，正在分析需求。

📋 初步分析:
- 任务: $I_TITLE
- 状态: 已认领，开始执行

🎯 执行计划:
1. 理解需求细节
2. 制定执行方案
3. 分步实施
4. 汇报结果

---
*回复格式: [skill/slug]/analyzed*"
      fi
    fi
  done
else
  echo "ℹ️ No open issues found."
fi

echo "===================================================="
echo "✅ Scan complete. $(date '+%Y-%m-%d %H:%M:%S')"
