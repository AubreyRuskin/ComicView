#!/bin/bash
set -e

cd "$(dirname "$0")"
echo "=== Updating ComicView ==="

git stash
git pull
git stash drop 2>/dev/null || true

.venv/bin/pip install -r requirements.txt -q

echo "Restarting service..."
if systemctl --user is-active comicview &>/dev/null; then
  systemctl --user restart comicview
elif systemctl is-active comicview &>/dev/null; then
  sudo systemctl restart comicview
fi

echo "Done! $(date)"
