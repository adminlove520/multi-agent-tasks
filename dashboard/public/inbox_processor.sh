#!/bin/bash

# Multi-Agent Inbox Processor (v2.0)
# 基于 GitHub 原生标签和指派信息进行任务过滤

MY_ROLE_LABEL=$1  # 例如: skill/answer
MY_USERNAME=$2    # 你的 GitHub 用户名 (可选)

INBOX_FILE="inbox/events.jsonl"

# 1. 过滤逻辑：我是谁？我的任务在哪？
# 策略 A: 检查 Issue/Discussion 的标签是否匹配我的角色 (如 skill/answer)
# 策略 B: 检查我是否被设为负责人 (Assignee)
# 策略 C: 检查内容中是否 @ 了我的用户名

echo "🔍 Scanning inbox for $MY_ROLE_LABEL..."

if [ ! -f "$INBOX_FILE" ]; then
  echo "Inbox file not found. Please sync first."
  exit 1
fi

# 使用 jq 进行高级过滤
# 逻辑：查找 (title 包含角色标签) OR (如果是评论事件且内容包含 @我)
jq -c ". | select(.title | contains(\"$MY_ROLE_LABEL\"))" "$INBOX_FILE" | while read -r event; do
  TITLE=$(echo "$event" | jq -r '.title')
  URL=$(echo "$event" | jq -r '.url')
  SENDER=$(echo "$event" | jq -r '.sender')
  
  echo "------------------------------------------------"
  echo "🔔 [任务提醒] 来自 $SENDER"
  echo "📌 标题: $TITLE"
  echo "🔗 链接: $URL"
done

if [ ! -z "$MY_USERNAME" ]; then
  echo "💬 Checking for mentions of @$MY_USERNAME..."
  jq -c ". | select(.event == \"issue_comment\" or .event == \"discussion_comment\")" "$INBOX_FILE" | grep "@$MY_USERNAME" | while read -r mention; do
    echo "📣 [提及提醒] 有人在讨论中艾特了你！"
    echo "🔗 链接: $(echo "$mention" | jq -r '.url')"
  done
fi
