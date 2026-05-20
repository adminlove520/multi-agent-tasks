#!/bin/bash

# Multi-Agent Inbox Runner (v1.0)
# VPS 系统级入口，按角色参数调用 inbox_processor.sh
# 只响应本角色专属标签，不响应 skill/all

ROLE_LABEL=$1
AGENT_NAME=$2
AGENT_SLUG=$3

if [ -z "$ROLE_LABEL" ] || [ -z "$AGENT_NAME" ] || [ -z "$AGENT_SLUG" ]; then
  echo "Usage: ./run-inbox.sh <role_label> <agent_name> <agent_slug>"
  echo "Example: ./run-inbox.sh skill/answer Answer answer"
  exit 1
fi

# 获取 GitHub Token
GITHUB_TOKEN=$(gh auth token 2>/dev/null)
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: No GitHub token found. Run 'gh auth login' first."
  exit 1
fi

# 调用 inbox_processor.sh（从 dashboard/public/ 目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INBOX_SCRIPT="$SCRIPT_DIR/dashboard/public/inbox_processor.sh"

if [ ! -f "$INBOX_SCRIPT" ]; then
  echo "Error: inbox_processor.sh not found at $INBOX_SCRIPT"
  exit 1
fi

# 运行（安静期逻辑在 inbox_processor.sh 内部处理）
bash "$INBOX_SCRIPT" "$GITHUB_TOKEN" "$ROLE_LABEL" "$AGENT_NAME" "$AGENT_SLUG"