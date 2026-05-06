#!/bin/bash

# Multi-Agent Inbox Processor (v3.0)
# 同步 GitHub 状态并处理任务

TOKEN=$1
MY_ROLE_LABEL=$2  # 例如: skill/answer
MY_USERNAME=$3    # 可选

DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"
INBOX_FILE="inbox/events.jsonl"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN is required."
  echo "Usage: ./inbox_processor.sh <token> <role_label> [username]"
  exit 1
fi

# 1. 同步最新代码 (确保 inbox/events.jsonl 是最新的)
echo "🔄 Syncing repository..."
git pull --rebase origin main

if [ ! -f "$INBOX_FILE" ]; then
  echo "ℹ️ Inbox is empty or not found. Checking direct Issues..."
else
  echo "🔍 Scanning inbox for $MY_ROLE_LABEL..."
  # 打印最近的任务提醒
  jq -c ". | select(.title | contains(\"$MY_ROLE_LABEL\"))" "$INBOX_FILE" | tail -n 5 | while read -r event; do
    echo "🔔 [Inbox Match]: $(echo "$event" | jq -r '.title') -> $(echo "$event" | jq -r '.url')"
  done
fi

# 2. 深度扫描 GitHub Issues (核心发现机制)
echo "🕵️ Deep scanning GitHub Issues for $MY_ROLE_LABEL..."
gh issue list --label "$MY_ROLE_LABEL" --label "task" --state open --json number,title,url,updatedAt --limit 10 | jq -c ".[]" | while read -r issue; do
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue" | jq -r '.title')
  URL=$(echo "$issue" | jq -r '.url')
  
  echo "------------------------------------------------"
  echo "📌 Found Task #$NUMBER: $TITLE"
  echo "🔗 $URL"
  echo "❓ Do you want to claim this task? (y/n)"
  # 如果是自动化 Agent，可以直接执行锁定逻辑
done
