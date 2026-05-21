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

  # 两层查重：
  # 1. 实质性回复（[@agent/taizi]）— agent 的正式报告，永久有效
  # 2. ACK 通知（@agent/taizi 收到）— 一次性确认，发送后不再重复
  HAS_REAL_I_REPLY=$(gh issue view $I_NUM --json comments --jq \
    ".comments[] | select(.author.login == \"agent/${AGENT_SLUG}\") | .body" 2>/dev/null | wc -l)
  HAS_ACK=$(gh issue view $I_NUM --json comments --jq \
    "[.comments[] | select(.author.login == \"agent/${AGENT_SLUG}\" and (.body | contains(\"[@${AGENT_SLUG}]\") or (.body | contains(\"@${AGENT_SLUG}\") and .body | contains(\"收到\"))))] | length")

  # 检查是否被艾特（标题+正文）
  # @agent/all → 所有agent都要回，@agent/taizi → 只有我回
  ISSUE_BODY=$(gh issue view $I_NUM --json body,title --jq '[.body, .title] | join(" ")' 2>/dev/null)
  IS_TAGGED_ISSUE=$(echo "$ISSUE_BODY" | grep -iE "@agent/all|@agent/${AGENT_SLUG}" | wc -l)

  # skill/all label 也视为被艾特（全员广播）
  HAS_SKILL_ALL=$(echo "$I_LABELS" | grep -c "skill/all" || true)

  # 触发条件：被@ 或 有 skill/all label
  SHOULD_RESPOND=$((IS_TAGGED_ISSUE + HAS_SKILL_ALL))

  echo "Issue #$I_NUM: $I_TITLE"
  echo "  → tagged=${IS_TAGGED_ISSUE}, skill/all=${HAS_SKILL_ALL}, real_reply=${HAS_REAL_I_REPLY}, ack=${HAS_ACK}"

  # 场景1：有实质性回复 → 跳过
  if [ "$HAS_REAL_I_REPLY" -gt "0" ]; then
    echo "  → 有实质性回复，跳过"
  # 场景2：触发 + 没 ACK → 发 ACK + 认领
  elif [ "$SHOULD_RESPOND" -gt "0" ] && [ "$HAS_ACK" -eq "0" ]; then
    echo "  → 触发，无 ACK，认领 + 发通知"
    gh issue edit $I_NUM --add-label "task/processing,$IDENTITY_LABEL" --remove-label "task" 2>/dev/null
    gh issue comment $I_NUM --body="@${AGENT_SLUG} 收到任务，我来分析一下，有结果后向你汇报。" 2>/dev/null
  # 场景3：触发 + 有 ACK → 跳过（避免重复发 ACK）
  elif [ "$SHOULD_RESPOND" -gt "0" ]; then
    echo "  → 触发，已有 ACK，跳过"
  # 场景4：没触发 → 跳过
  else
    echo "  → 没被艾特且无 skill/all，跳过"
  fi
done

echo "Issue scan complete."
