#!/bin/bash
# daily_report.sh - 生成/发送日报

TOKEN="$1"
OWNER="$2"
REPO_NAME="$3"
AGENT_NAME="$4"
MY_ROLE_LABEL="$5"
AGENT_SLUG="$6"

export GITHUB_TOKEN="$TOKEN"

TODAY=$(date +%Y-%m-%d)
REPORT_FILE="/tmp/agent_${AGENT_SLUG}_report_${TODAY}.md"

# 只在每天特定时间（9:00, 18:00）生成日报
HOUR=$(date +%H)
if [ "$HOUR" != "09" ] && [ "$HOUR" != "18" ]; then
  echo "Not report time (only 09:00/18:00), skipping."
  exit 0
fi

echo "Generating daily report..."

# 收集今日完成的任务
TASKS_DONE=$(gh issue list --state closed --search "updated:>$TODAY" --json number,title --jq '.[] | "- #\(.number) \(.title)"' 2>/dev/null | head -10)

# 收集进行中的任务
TASKS_PROGRESS=$(gh issue list --state open --search "label:task/processing" --json number,title --jq '.[] | "- #\(.number) \(.title)"' 2>/dev/null | head -10)

# 生成报告
cat > "$REPORT_FILE" << EOF
# $AGENT_NAME 日报 - $TODAY

## 今日完成
$TASKS_DONE
(无)

## 正在进行
$TASKS_PROGRESS
(无)

## 明日计划
-

## 问题/阻塞
-
EOF

# 发到 Discussion
DISCUSSION_QUERY='mutation($repoId:ID!,$title:String!,$body:String!){createDiscussion(input:{repositoryId:$repoId,title:$title,body:$body,categoryId:"DIC_kwDOSSZwPM4C8Lyk"}){discussion{id}}}'"

REPO_ID=$(gh api repos "$OWNER/$REPO_NAME" --jq '.node_id')

gh api graphql -f query="$DISCUSSION_QUERY" \
  -f repoId="$REPO_ID" \
  -f title="[日报] $AGENT_NAME - $TODAY" \
  -f body="$(cat $REPORT_FILE)" >/dev/null 2>&1

echo "Daily report sent."
rm -f "$REPORT_FILE"