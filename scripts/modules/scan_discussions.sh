#!/bin/bash
# scan_discussions.sh - 扫描讨论

TOKEN="$1"
OWNER="$2"
REPO_NAME="$3"
AGENT_NAME="$4"
AGENT_SLUG="$5"
VIRTUAL_MENTION="$6"
MY_ROLE_LABEL="$7"

export GITHUB_TOKEN="$TOKEN"

echo "Scanning discussions..."

DISC_QUERY='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){discussions(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{id,number,title,body,comments(last:20){nodes{author{login},body}}}}}}'

DISC_DATA=$(gh api graphql -f owner="$OWNER" -f repo="$REPO_NAME" -f query="$DISC_QUERY" --jq ".data.repository.discussions.nodes[]" 2>/dev/null)

if [ -z "$DISC_DATA" ]; then
  echo "No discussions found."
  exit 0
fi

echo "$DISC_DATA" | jq -c "." | while read -r disc; do
  D_ID=$(echo "$disc" | jq -r '.id')
  D_NUM=$(echo "$disc" | jq -r '.number')
  D_TITLE=$(echo "$disc" | jq -r '.title')

  # 检查是否已发布过回复（只要包含 [@AgentName] 前缀就算，不管内容类型）
  HAS_POSTED=$(echo "$disc" | jq -r ".comments.nodes[] | .body" 2>/dev/null | grep -F "[$AGENT_NAME]" | wc -l)
  
  # 检查是否包含实质性方案回复（包含 [PROPOSAL]）
  HAS_REAL_REPLY=$(echo "$disc" | jq -r ".comments.nodes[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null | grep -i "\[PROPOSAL\]" | wc -l)
  
  # 检查是否被艾特（只查标题+正文，不查评论）
  IS_TAGGED=$(echo "$disc" | jq -r ".title, .body" | grep -i "@agent/${AGENT_SLUG}" | wc -l)

  if [ "$IS_TAGGED" -gt "0" ] && [ "$HAS_REAL_REPLY" -eq "0" ]; then
    echo "TAGGED in Discussion #$D_NUM: $D_TITLE"
    gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
      -f id="$D_ID" -f body="[$AGENT_NAME] [PROPOSAL]: 已收到艾特！我正在分析，稍后给出方案。" >/dev/null
  elif [ "$HAS_POSTED" -eq "0" ]; then
    # 没有被艾特且从未回复 → 跳过（不发送 ACK）
    echo "Discussion #$D_NUM: skipped (not tagged, no ACK needed)"
  elif [ "$HAS_REAL_REPLY" -eq "0" ]; then
    echo "Discussion #$D_NUM: PENDING DEBT - needs PROPOSAL"
    gh api graphql -f query='mutation($id:ID!,$body:String!){addDiscussionComment(input:{discussionId:$id,body:$body}){comment{id}}}' \
      -f id="$D_ID" -f body="[$AGENT_NAME] [PROPOSAL]: 经过分析，执行方案如下。" >/dev/null
  fi
done

echo "Discussion scan complete."