#!/bin/bash
set -e

SERVICE_NAME="comicview"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing ComicView systemd service ==="

# Check for virtualenv
if [ ! -f "$SCRIPT_DIR/.venv/bin/python3" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$SCRIPT_DIR/.venv"
  "$SCRIPT_DIR/.venv/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

# Generate service file with correct paths
SERVICE_FILE="$SCRIPT_DIR/comicview.service"
cat > "$SERVICE_FILE" << SERVICEOF
[Unit]
Description=ComicView - Local Comic Web Reader
After=network.target

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/.venv/bin/python3 $SCRIPT_DIR/app.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=comicview

[Install]
WantedBy=multi-user.target
SERVICEOF

# Install
if [ "$1" = "--user" ]; then
  # User service (no sudo needed)
  mkdir -p ~/.config/systemd/user
  cp "$SERVICE_FILE" ~/.config/systemd/user/
  systemctl --user daemon-reload
  systemctl --user enable "$SERVICE_NAME"
  systemctl --user start "$SERVICE_NAME"
  echo ""
  echo "Done! User service installed."
  echo "  Status : systemctl --user status $SERVICE_NAME"
  echo "  Logs   : journalctl --user -u $SERVICE_NAME -f"
  echo ""
  echo "To enable linger (start on boot without login):"
  echo "  sudo loginctl enable-linger $USER"
else
  # System service
  sudo cp "$SERVICE_FILE" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl start "$SERVICE_NAME"
  echo ""
  echo "Done! System service installed."
  echo "  Status : systemctl status $SERVICE_NAME"
  echo "  Logs   : journalctl -u $SERVICE_NAME -f"
fi
