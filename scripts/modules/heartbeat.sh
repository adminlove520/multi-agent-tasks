#!/bin/bash
# heartbeat.sh - 心跳注册

DASHBOARD_URL="$1"
AGENT_NAME="$2"
MY_ROLE_LABEL="$3"

curl -s -X POST "$DASHBOARD_URL/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\", \"role\":\"$MY_ROLE_LABEL\", \"action\":\"heartbeat\"}" > /dev/null

echo "Heartbeat registered."