#!/bin/bash

# Multi-Agent Task Hub Skill Installer
# Usage: curl -sSL https://your-dashboard.vercel.app/install.sh | bash -s -- <skill-name> <github-token> <target-dir>

SKILL_NAME=$1
TOKEN=$2
TARGET_DIR=$3
DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$SKILL_NAME" ]; then
  echo "Error: Skill name is required."
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo "Error: GitHub Token is required for installation."
  exit 1
fi

if [ -z "$TARGET_DIR" ]; then
  TARGET_DIR="./skills/$SKILL_NAME"
fi

echo "🚀 Installing skill: $SKILL_NAME into $TARGET_DIR..."

mkdir -p "$TARGET_DIR"

# Fetch SKILL.md with token
curl -sSL "$DASHBOARD_URL/api/skills?name=$SKILL_NAME&file=SKILL.md&token=$TOKEN" -o "$TARGET_DIR/SKILL.md"

if [ $? -eq 0 ]; then
  echo "✅ Skill $SKILL_NAME installed successfully!"
  echo "👉 Next steps: Configure your ROLE_LABEL in the agent's environment."
else
  echo "❌ Failed to install skill."
  exit 1
fi
