#!/bin/bash
# scan_issues.sh - 扫描Issues

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

  if echo "$I_LABELS" | grep -qE "($MY_ROLE_LABEL|skill/all)"; then
    HAS_REAL_I_REPLY=$(gh issue view $I_NUM --json comments --jq ".comments[] | select(.body | contains(\"[$AGENT_NAME]\")) | .body" 2>/dev/null | grep -v "\[ACK\]" | wc -l)

    ISSUE_BODY=$(gh issue view $I_NUM --json body,title --jq '[.body, .title] | join(" ")' 2>/dev/null)
    IS_TAGGED_ISSUE=$(echo "$ISSUE_BODY" | grep -i "@agent/${AGENT_SLUG}" | wc -l)

    echo "Issue #$I_NUM: $I_TITLE"

    if [ "$IS_TAGGED_ISSUE" -gt "0" ] && [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
      echo "  TAGGED - responding..."
      gh issue comment $I_NUM --body="[@agent/${AGENT_SLUG}] 已收到艾特！我正在查看，稍后向将军汇报。" 2>/dev/null
    elif [ "$HAS_REAL_I_REPLY" -eq "0" ]; then
      echo "  PENDING DEBT - needs PROPOSAL"
      gh issue comment $I_NUM --body="[$AGENT_NAME] [PROPOSAL]: 经过分析，执行方案如下。" 2>/dev/null
      IS_LOCKED=$(gh issue view $I_NUM --json labels --jq ".labels[] | select(.name | startswith(\"agent/\"))" 2>/dev/null | wc -l)
      if echo "$I_LABELS" | grep -q "$MY_ROLE_LABEL" && [ "$IS_LOCKED" -eq "0" ]; then
        echo "  Claiming task..."
        gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task" 2>/dev/null
      fi
    fi
  fi
done

echo "Issue scan complete."