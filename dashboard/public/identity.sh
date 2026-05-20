#!/bin/bash
# identity.sh - Agent 身份验证和认领脚本
# 每个 Agent 必须先运行此脚本验证身份，确保 cron 参数正确

AGENT_SLUG="$1"      # taizi 或 answer
MY_ROLE_LABEL="$2"   # skill/taizi 或 skill/answer
AGENT_NAME="$3"      # 太子 或 Answer

CONFIG_FILE="/tmp/agent_${AGENT_SLUG}_identity.json"

# 期望的配置
case "$AGENT_SLUG" in
  taizi)
    EXPECTED_ROLE="skill/taizi"
    EXPECTED_NAME="太子"
    ;;
  answer)
    EXPECTED_ROLE="skill/answer"
    EXPECTED_NAME="Answer"
    ;;
  *)
    echo "Error: Unknown agent slug '$AGENT_SLUG'. Valid values: taizi, answer"
    exit 1
    ;;
esac

echo "=========================================="
echo "身份验证: $AGENT_NAME ($AGENT_SLUG)"
echo "=========================================="

# 1. 检查参数是否匹配
if [ "$MY_ROLE_LABEL" != "$EXPECTED_ROLE" ]; then
  echo "ERROR: Role mismatch!"
  echo "  Expected: $EXPECTED_ROLE"
  echo "  Got: $MY_ROLE_LABEL"
  echo ""
  echo "请检查 cron 配置是否正确！"
  exit 1
fi

if [ "$AGENT_NAME" != "$EXPECTED_NAME" ]; then
  echo "ERROR: Name mismatch!"
  echo "  Expected: $EXPECTED_NAME"
  echo "  Got: $AGENT_NAME"
  echo ""
  echo "请检查 cron 配置是否正确！"
  exit 1
fi

echo "✓ 参数验证通过"
echo "  Role: $MY_ROLE_LABEL"
echo "  Name: $AGENT_NAME"

# 2. 检查 cron 配置（在太子的 VPS 上需要确认只有自己的 cron）
if [ -f "/tmp/agent_crons.txt" ]; then
  echo ""
  echo "检查 cron 配置..."
  OTHER_AGENT=$(grep -v "$AGENT_SLUG" /tmp/agent_crons.txt 2>/dev/null | head -1)
  if [ -n "$OTHER_AGENT" ]; then
    echo "WARNING: 发现其他 Agent 的 cron:"
    echo "  $OTHER_AGENT"
    echo ""
    echo "在太子的 VPS 上不应该有其他 Agent 的 cron！"
  fi
fi

# 3. 保存身份配置
cat > "$CONFIG_FILE" << EOF
{
  "agent_slug": "$AGENT_SLUG",
  "role_label": "$MY_ROLE_LABEL",
  "agent_name": "$AGENT_NAME",
  "verified_at": "$(date -Iseconds)"
}
EOF

echo ""
echo "✓ 身份配置已保存到: $CONFIG_FILE"
echo ""
echo "=========================================="
echo "身份验证完成"
echo "=========================================="

# 4. 输出建议的 cron 配置
echo ""
echo "建议的 cron 配置："
echo "*/5 * * * * cd ~/multi-agent-tasks && bash inbox_processor.sh \"\$TOKEN\" \"$MY_ROLE_LABEL\" \"$AGENT_NAME\" \"$AGENT_SLUG\" >> /tmp/agent_${AGENT_SLUG}_cron.log 2>&1"
echo ""
echo "（复制上面这行到 crontab -e 中）"