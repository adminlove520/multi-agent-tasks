#!/bin/bash
# scan_issues.sh - 扫描Issues
# 规则：被艾特才回复（发实质性PROPOSAL），没被艾特不打扰

TOKEN="$1"
OWNER="$2"
AGENT_NAME="$3"
AGENT_SLUG="$4"
MY_ROLE_LABEL="$5"
IDENTITY_LABEL="$6"

export GITHUB_TOKEN="$TOKEN"

echo "Scanning issues..."

ISSUE_DATA=$(gh issue list --state open --json number,title,labels --limit 20 2>/dev/null)

if [ -z "$ISSUE_DATA" ] || [ "$ISSUE_DATA" = "[]" ]; then
  echo "No open issues found."
  exit 0
fi

echo "$ISSUE_DATA" | jq -c ".[]" | while read -r issue; do
  I_NUM=$(echo "$issue" | jq -r '.number')
  I_TITLE=$(echo "$issue" | jq -r '.title')
  I_LABELS=$(echo "$issue" | jq -r '.labels[].name')

  # 过滤有 MY_ROLE_LABEL 或 skill/all 标签的 issue
  if ! echo "$I_LABELS" | grep -qE "($MY_ROLE_LABEL|skill/all)"; then
    continue
  fi

  # 检查是否已有实质性回复（包含 [PROPOSAL]，排除空 ACK）
  HAS_REAL_I_REPLY=$(gh issue view $I_NUM --json comments --jq \
    ".comments[] | select(.body | contains(\"[$AGENT_NAME]\")) | select(.body | test(\"[PROPOSAL]\")) | .body" 2>/dev/null | wc -l)

  # 检查是否被艾特（标题+正文）
  ISSUE_BODY=$(gh issue view $I_NUM --json body,title --jq '[.body, .title] | join(" ")' 2>/dev/null)
  IS_TAGGED_ISSUE=$(echo "$ISSUE_BODY" | grep -i "@agent/${AGENT_SLUG}" | wc -l)

  echo "Issue #$I_NUM: $I_TITLE"

  # 场景1：被艾特 + 没回复过 → 发 PROPOSAL + 认领
  if [ "$IS_TAGGED_ISSUE" -gt "0" ] && [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
    echo "  → 被艾特，认领 + 发 PROPOSAL"
    gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task" 2>/dev/null
    gh issue comment $I_NUM --body="[$AGENT_NAME] [PROPOSAL]: 经过分析，执行方案如下。" 2>/dev/null
  # 场景2：没被艾特 + 没回复过 → 跳过（不打扰）
  elif [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
    echo "  → 没被艾特，跳过（不打扰）"
  fi
done

echo "Issue scan complete."
