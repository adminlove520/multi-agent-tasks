#!/bin/bash
# generate_cron.sh - 根据 agents.json 自动生成 cron 配置
# 用法: bash scripts/generate_cron.sh [agents.json路径]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_JSON="${1:-$ROOT_DIR/agents.json}"

if [ ! -f "$AGENTS_JSON" ]; then
  echo "Error: agents.json not found at $AGENTS_JSON"
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  node "$SCRIPT_DIR/generate_cron.js" "$AGENTS_JSON"
else
  echo "Error: node not found. Please install Node.js."
  exit 1
fi