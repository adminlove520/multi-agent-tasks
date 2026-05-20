#!/bin/bash
# verify_identity.sh - 快速验证身份并输出 cron 配置
# 用法: bash verify_identity.sh taizi

AGENT_SLUG="$1"

if [ -z "$AGENT_SLUG" ]; then
  echo "Usage: bash verify_identity.sh <taizi|answer>"
  exit 1
fi

echo "=========================================="
echo "Agent Identity: $AGENT_SLUG"
echo "=========================================="

case "$AGENT_SLUG" in
  taizi)
    ROLE="skill/taizi"
    NAME="太子"
    ;;
  answer)
    ROLE="skill/answer"
    NAME="Answer"
    ;;
  *)
    echo "Unknown agent: $AGENT_SLUG"
    exit 1
    ;;
esac

echo ""
echo "请确认以下 cron 配置正确："
echo ""
echo "*/5 * * * * cd ~/multi-agent-tasks && bash inbox_processor.sh \"\$TOKEN\" \"$ROLE\" \"$NAME\" \"$AGENT_SLUG\" >> /tmp/agent_${AGENT_SLUG}_cron.log 2>&1"
echo ""
echo "复制上面的行到 crontab -e"
echo ""