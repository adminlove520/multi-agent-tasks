#!/bin/bash
# update_activity.sh - 更新活动时间

AGENT_SLUG="$1"
STATE_FILE="/tmp/agent_${AGENT_SLUG}_state.json"
NOW=$(date +%s)

if [ -f "$STATE_FILE" ]; then
  LAST_ACTIVITY=$(jq -r '.last_activity' "$STATE_FILE" 2>/dev/null)
else
  LAST_ACTIVITY=0
fi

# 如果有新活动，更新活动时间
echo "{\"last_activity\":$NOW,\"last_scan\":$NOW}" > "$STATE_FILE"

echo "Activity updated: $NOW"