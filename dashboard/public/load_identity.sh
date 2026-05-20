#!/bin/bash
# load_identity.sh - 从 agents.json 读取身份
# Dashboard WebUI 会同步 agents.json，Agent 读取此文件确定身份

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS_JSON="$SCRIPT_DIR/../agents.json"

if [ ! -f "$AGENTS_JSON" ]; then
  echo "Error: agents.json not found at $AGENTS_JSON"
  echo "请先在 Dashboard 配置 Agent 身份"
  exit 1
fi

# 获取当前 Agent 的身份（通过 hostname 或环境变量区分）
# 默认读取第一个 Agent，可以覆盖
HOSTNAME=$(hostname 2>/dev/null || echo "default")

# 从 agents.json 读取所有 Agent
AGENTS=$(cat "$AGENTS_JSON" | jq -r '.agents[] | @json' 2>/dev/null)

if [ -z "$AGENTS" ]; then
  echo "Error: Failed to parse agents.json"
  exit 1
fi

# 输出可用 Agent 列表（用于手动选择或调试）
echo "=========================================="
echo "从 agents.json 读取的身份："
echo "=========================================="
echo "$AGENTS" | jq -r '.name, .role, .slug' 2>/dev/null | paste - - -
echo ""

# 默认使用第一个 Agent（可以后续通过环境变量覆盖）
FIRST_AGENT=$(echo "$AGENTS" | jq -s '.[0]' 2>/dev/null)

export AGENT_NAME=$(echo "$FIRST_AGENT" | jq -r '.name')
export AGENT_SLUG=$(echo "$FIRST_AGENT" | jq -r '.slug')
export MY_ROLE_LABEL=$(echo "$FIRST_AGENT" | jq -r '.role')
export IDENTITY_LABEL="agent/${AGENT_SLUG}"
export VIRTUAL_MENTION="@agent/${AGENT_SLUG}"

echo "当前身份："
echo "  Name: $AGENT_NAME"
echo "  Slug: $AGENT_SLUG"
echo "  Role: $MY_ROLE_LABEL"
echo "=========================================="