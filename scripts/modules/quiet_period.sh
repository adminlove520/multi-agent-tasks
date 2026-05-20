#!/bin/bash
# quiet_period.sh - 安静期控制

AGENT_SLUG="$1"
QUIET_WINDOW=1800  # 30分钟
STATE_FILE="/tmp/agent_${AGENT_SLUG}_state.json"

read_state() {
  LAST_ACTIVITY=$(jq -r '.last_activity // 0' "$STATE_FILE" 2>/dev/null || echo 0)
  LAST_SCAN=$(jq -r '.last_scan // 0' "$STATE_FILE" 2>/dev/null || echo 0)
}

read_state
NOW=$(date +%s)

SHOULD_SCAN=0
if [ $((NOW - LAST_ACTIVITY)) -lt $QUIET_WINDOW ]; then
  SHOULD_SCAN=1
elif [ $((NOW - LAST_SCAN)) -ge $QUIET_WINDOW ]; then
  SHOULD_SCAN=1
fi

if [ "$SHOULD_SCAN" -eq 0 ]; then
  AGE=$((NOW - LAST_ACTIVITY))
  echo "Quiet period (no recent notifications). Skip scan. Last activity: ${AGE}s ago"
  exit 1
fi

echo "Continuing scan..."
exit 0