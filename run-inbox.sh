#!/bin/bash

# Agent Runner - 简化版入口
# Usage: ./run-inbox.sh <agent_slug>
# Example: ./run-inbox.sh taizi

AGENT_SLUG="$1"

if [ -z "$AGENT_SL" ]; then
  echo "Usage: ./run-inbox.sh <agent_slug>"
  echo "Example: ./run-inbox.sh taizi"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GITHUB_TOKEN=$(gh auth token 2>/dev/null)

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: No GitHub token. Run 'gh auth login' first."
  exit 1
fi

exec bash "$SCRIPT_DIR/scripts/inbox_processor.sh" "$GITHUB_TOKEN" "$AGENT_SLUG"