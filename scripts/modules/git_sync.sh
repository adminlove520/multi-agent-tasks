#!/bin/bash
# git_sync.sh - Git 同步

SCRIPT_DIR="$1"

cd "$SCRIPT_DIR" || exit 1

if [ -d ".git" ]; then
  echo "Syncing with remote..."
  git fetch origin main >/dev/null 2>&1 && git reset --hard origin/main >/dev/null 2>&1
  echo "Sync complete."
else
  echo "Not a git repo, skipping sync."
fi