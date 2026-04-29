#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

echo "Starting ComicView on http://${HOST:-0.0.0.0}:${PORT:-5000}"
echo "Config: $(pwd)/config.json"
exec .venv/bin/python3 app.py
