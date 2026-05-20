#!/bin/bash

# Multi-Agent Inbox Processor (v3.4.0)
# 模块化设计：各功能拆分为独立脚本
# 主入口负责调度，不处理具体逻辑

TOKEN="$1"
MY_ROLE_LABEL="$2"  # 例如: skill/answer
AGENT_NAME="$3"     # 智能体名称 (如: 小溪)
AGENT_SLUG="$4"     # 虚拟艾特识别名 (如: xiaoxi)

DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$TOKEN" ] || [ -z "$MY_ROLE_LABEL" ] || [ -z "$AGENT_NAME" ]; then
  echo "Usage: ./inbox_processor.sh <token> <role_label> <agent_name> [agent_slug]"
  exit 1
fi

[ -z "$AGENT_SLUG" ] && AGENT_SLUG=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g')
IDENTITY_LABEL="agent/$AGENT_SLUG"
VIRTUAL_MENTION="@agent/${AGENT_SLUG}"

# 自动解析仓库信息
export GITHUB_TOKEN="$TOKEN"
REPO_JSON=$(gh repo view --json nameWithOwner 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "Error: Failed to access GitHub repository"
  exit 1
fi
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

# 调用安静期检查
bash "$SCRIPT_DIR/modules/quiet_period.sh" "$AGENT_SLUG" || exit 0

# 调用 git 同步
bash "$SCRIPT_DIR/modules/git_sync.sh" "$SCRIPT_DIR"

# 调用心跳注册
bash "$SCRIPT_DIR/modules/heartbeat.sh" "$DASHBOARD_URL" "$AGENT_NAME" "$MY_ROLE_LABEL"

# 调用讨论扫描
bash "$SCRIPT_DIR/modules/scan_discussions.sh" \
  "$TOKEN" "$OWNER" "$REPO_NAME" "$AGENT_NAME" "$AGENT_SLUG" "$VIRTUAL_MENTION" "$MY_ROLE_LABEL"

# 调用 Issue 扫描
bash "$SCRIPT_DIR/modules/scan_issues.sh" \
  "$TOKEN" "$OWNER" "$AGENT_NAME" "$AGENT_SLUG" "$MY_ROLE_LABEL" "$IDENTITY_LABEL"

# 调用日报生成（只在每天特定时间或每周触发）
if [ -f "$SCRIPT_DIR/modules/daily_report.sh" ]; then
  bash "$SCRIPT_DIR/modules/daily_report.sh" \
    "$TOKEN" "$OWNER" "$REPO_NAME" "$AGENT_NAME" "$MY_ROLE_LABEL" "$AGENT_SLUG"
fi

# 更新安静期状态
bash "$SCRIPT_DIR/modules/update_activity.sh" "$AGENT_SLUG"

echo "===================================================="
echo "Scan complete."