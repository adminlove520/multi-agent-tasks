#!/bin/bash

# Telegram Notification Helper
# Usage: ./tg_notify.sh "Message content"

TOKEN="${TELEGRAM_BOT_TOKEN}"
CHAT_ID="${TELEGRAM_CHAT_ID}"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "Telegram config missing. Skipping notification."
  exit 0
fi

# Clean message for HTML mode
MESSAGE=$(echo "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')

curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID" \
  -d "parse_mode=HTML" \
  -d "text=$MESSAGE" \
  -d "disable_web_page_preview=true"
