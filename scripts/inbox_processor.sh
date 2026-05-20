#!/bin/bash

# Multi-Agent Inbox Processor (v3.5.0)
# Agent 身份从 agents.json 自动读取

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN="$1"
AGENT_SLUG="$2"
DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$TOKEN" ] || [ -z "$AGENT_SLUG" ]; then
  echo "Usage: ./inbox_processor.sh <token> <agent_slug>"
  echo "Example: ./inbox_processor.sh ghp_xxx taizi"
  exit 1
fi

# 加载身份（根据 slug 从 agents.json 读取）
source "$SCRIPT_DIR/load_identity.sh" "$AGENT_SLUG"

# 自动解析仓库信息
export GITHUB_TOKEN="$TOKEN"
REPO_JSON=$(gh repo view --json nameWithOwner 2>/dev/null)
REPO_FULL=$(echo "$REPO_JSON" | jq -r ".nameWithOwner")
OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)

echo "===================================================="
echo "Agent: $AGENT_NAME ($AGENT_SLUG) | Role: $MY_ROLE_LABEL"
echo "Repo: $OWNER/$REPO_NAME"
echo "===================================================="

# 并发锁保护
LOCKFILE="/tmp/agent_${AGENT_SLUG}.lock"
exec 200>$LOCKFILE
flock -n 200 || { echo "Agent $AGENT_NAME is already running. Skipping."; exit 0; }

# 调用模块
bash "$SCRIPT_DIR/modules/quiet_period.sh" "$AGENT_SLUG" || exit 0
bash "$SCRIPT_DIR/modules/git_sync.sh" "$ROOT_DIR"
bash "$SCRIPT_DIR/modules/heartbeat.sh" "$DASHBOARD_URL" "$AGENT_NAME" "$MY_ROLE_LABEL"
bash "$SCRIPT_DIR/modules/scan_discussions.sh" \
  "$TOKEN" "$OWNER" "$REPO_NAME" "$AGENT_NAME" "$AGENT_SLUG" "$VIRTUAL_MENTION" "$MY_ROLE_LABEL"
bash "$SCRIPT_DIR/modules/scan_issues.sh" \
  "$TOKEN" "$OWNER" "$AGENT_NAME" "$AGENT_SLUG" "$MY_ROLE_LABEL" "$IDENTITY_LABEL"
bash "$SCRIPT_DIR/modules/daily_report.sh" \
  "$TOKEN" "$OWNER" "$REPO_NAME" "$AGENT_NAME" "$MY_ROLE_LABEL" "$AGENT_SLUG"
bash "$SCRIPT_DIR/modules/update_activity.sh" "$AGENT_SLUG"

echo "===================================================="
echo "Scan complete."