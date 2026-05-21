#!/bin/bash
# scan_discussions.sh - 扫描讨论
# 规则：被艾特才回复（发实质性PROPOSAL），没被艾特不打扰

TOKEN="$1"
OWNER="$2"
REPO_NAME="$3"
AGENT_NAME="$4"
AGENT_SLUG="$5"
VIRTUAL_MENTION="$6"
MY_ROLE_LABEL="$7"

export GITHUB_TOKEN="$TOKEN"

echo "Scanning discussions..."

DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,body,labels(first:10){nodes{name}},comments(last:20){nodes{author{login},body}}}}}}'

DISC_DATA=$(gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" 2>/dev/null)

if [ -z "$DISC_DATA" ]; then
  echo "No discussions found."
  exit 0
fi

echo "$DISC_DATA" | jq -c "." | while read -r disc; do
  D_ID=$(echo "$disc" | jq -r '.id')
  D_NUM=$(echo "$disc" | jq -r '.number')
  D_TITLE=$(echo "$disc" | jq -r '.title')

  # 两层查重：
  # 1. 实质性回复（[@agent/taizi]）— agent 的正式报告，永久有效
  # 2. ACK 通知（@agent/taizi 收到）— 一次性确认，发送后不再重复
  HAS_REAL_REPLY=$(echo "$disc" | jq -r "[.comments.nodes[] | select(.body | contains(\"[@agent/${AGENT_SLUG}]\"))] | length" 2>/dev/null)
  HAS_ACK=$(echo "$disc" | jq -r "[.comments.nodes[] | select(.body | contains(\"[@${AGENT_SLUG}]\") or (.body | contains(\"@${AGENT_SLUG}\") and .body | contains(\"收到\"))))] | length" 2>/dev/null)

  # 检查是否被艾特（标题+正文，不查评论避免自己触发自己）
  # @agent/all → 所有agent都要回，@agent/taizi → 只有我回
  IS_TAGGED=$(echo "$disc" | jq -r ".title, .body" | grep -iE "@agent/all|@agent/${AGENT_SLUG}" | wc -l)

  # skill/all label 也视为被艾特（全员广播）
  D_LABELS=$(echo "$disc" | jq -r ".labels.nodes[].name" 2>/dev/null)
  HAS_SKILL_ALL=$(echo "$D_LABELS" | grep -c "skill/all" || true)

  # 触发条件：被@ 或 有 skill/all label
  SHOULD_RESPOND=$((IS_TAGGED + HAS_SKILL_ALL))

  echo "Discussion #$D_NUM: $D_TITLE"
  echo "  → tagged=${IS_TAGGED}, skill/all=${HAS_SKILL_ALL}, real_reply=${HAS_REAL_REPLY}, ack=${HAS_ACK}"

  # 场景1：有实质性回复 → 跳过
  if [ "$HAS_REAL_REPLY" -gt "0" ]; then
    echo "  → 有实质性回复，跳过"
  # 场景2：触发 + 没 ACK → 发 ACK
  elif [ "$SHOULD_RESPOND" -gt "0" ] && [ "$HAS_ACK" -eq "0" ]; then
    echo "  → 触发，无 ACK，发通知"
    gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
      -f id="$D_ID" -f body="@${AGENT_SLUG} 收到艾特，我来分析一下，有结果后汇报。" >/dev/null
  # 场景3：触发 + 有 ACK → 跳过
  elif [ "$SHOULD_RESPOND" -gt "0" ]; then
    echo "  → 触发，已有 ACK，跳过"
  # 场景4：没触发 → 跳过
  else
    echo "  → 没被艾特且无 skill/all，跳过"
  fi
done

echo "Discussion scan complete."
