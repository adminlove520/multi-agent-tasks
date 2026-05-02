#!/bin/bash

# Multi-Agent Inbox Processor
# 功能：读取 inbox/events.jsonl 并将其转化为 Agent 可理解的 Action

INBOX_FILE="inbox/events.jsonl"

# 1. 同步最新 Inbox (通过 git pull 或 gh api)
sync_inbox() {
  echo "📥 Syncing inbox from GitHub..."
  gh api repos/:owner/:repo/contents/inbox/events.jsonl --jq '.content' | base64 -d > "$INBOX_FILE"
}

# 2. 解析并过滤属于我的任务
process_inbox() {
  MY_ROLE=$1
  echo "🔍 Processing notifications for role: $MY_ROLE"
  
  if [ ! -f "$INBOX_FILE" ]; then
    echo "Inbox is empty."
    return
  }

  # 遍历 jsonl
  while read -r line; do
    EVENT=$(echo "$line" | jq -r '.event')
    TITLE=$(echo "$line" | jq -r '.title')
    
    # 如果标题包含我的角色，或者是我参与的讨论
    if [[ "$TITLE" == *"$MY_ROLE"* ]]; then
      echo "🔔 [ACTION REQUIRED] New $EVENT: $TITLE"
      echo "   Link: $(echo "$line" | jq -r '.url')"
    fi
  done < "$INBOX_FILE"
}

# 3. 清理已读 (原子化操作：将 inbox 改名或清空并推送到仓库)
clear_inbox() {
  echo "🧹 Clearing processed inbox..."
  # 实际逻辑应为：将本地处理完的偏移量记下来，或者直接在远端清空
  gh api -X PUT repos/:owner/:repo/contents/inbox/events.jsonl \
    -f message="✅ Inbox cleared by agent" \
    -f content="" \
    -f sha=$(gh api repos/:owner/:repo/contents/inbox/events.jsonl --jq '.sha')
}

case "$1" in
  "sync") sync_inbox ;;
  "process") process_inbox "$2" ;;
  "clear") clear_inbox ;;
esac
