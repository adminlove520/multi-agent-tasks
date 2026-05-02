#!/bin/bash

# Agent Startup Helper: Fetch the latest protocol and identity
# Usage: ./bootstrap.sh <github_token> [skill_name]

TOKEN=$1
SKILL=${2:-"general"}
DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN is required."
  echo "Usage: ./bootstrap.sh <your_github_token> [skill_name]"
  exit 1
fi

echo "🔄 Bootstrapping agent ($SKILL) using Dashboard API..."

# 1. Fetch Global Protocol & Identity via Bootstrap API
# We pass the token to the API so it can fetch private repo content if needed
RESPONSE=$(curl -sSL "$DASHBOARD_URL/api/bootstrap?token=$TOKEN")

# Check if response is valid JSON and contains protocol
PROTOCOL=$(echo "$RESPONSE" | grep -o '"protocol":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROTOCOL" ]; then
  echo "❌ Error: Failed to fetch protocol. Response: $RESPONSE"
  exit 1
fi

# Decode JSON string (handle \n, \t etc) - simple version using printf
printf "%b" "$PROTOCOL" > "./PROTOCOL.md"

# 2. Get Agent Info from agents.json via Dashboard (Optional but helpful)
curl -sSL "$DASHBOARD_URL/api/agents?token=$TOKEN" -o "./agents_config.json"

echo "✅ System bound successfully."
echo "📜 Protocol saved to ./PROTOCOL.md"
echo "🤖 Agent config saved to ./agents_config.json"
echo "🚀 Agent is ready to process tasks from inbox."
