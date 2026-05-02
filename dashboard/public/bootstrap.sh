#!/bin/bash

# Agent Startup Helper: Fetch the latest protocol and identity
# Usage: ./bootstrap.sh <skill_name>

SKILL=$1
DASHBOARD_URL="https://multi-agent-task-dashboard.vercel.app"

echo "🔄 Bootstrapping agent for $SKILL..."

# 1. Fetch Global Protocol
curl -sSL "$DASHBOARD_URL/api/skills?name=task-hub-creator&file=../../docs/global_protocol_CN.md" -o "./PROTOCOL.md"

# 2. Inject into local prompt (Pseudo-code)
# This file can be read by the agent at every start
echo "✅ Protocol synced. Your identity is now bound to $SKILL."
