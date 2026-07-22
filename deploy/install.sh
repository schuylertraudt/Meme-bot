#!/usr/bin/env bash
# Run from the repo root on your Ubuntu server: sudo bash deploy/install.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy/install.sh"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
NODE_BIN="$(command -v node || true)"

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js not found. Install it first, e.g.:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

if [[ ! -f "$REPO_DIR/.env" ]]; then
  echo "$REPO_DIR/.env not found."
  echo "Create it first: cp .env.example .env && nano .env  (set DISCORD_TOKEN=...)"
  exit 1
fi

echo "Installing npm dependencies as $RUN_USER..."
sudo -u "$RUN_USER" npm install --prefix "$REPO_DIR"

SERVICE_FILE="/etc/systemd/system/meme-bot.service"
echo "Writing $SERVICE_FILE..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Meme Bot Discord Bot
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$REPO_DIR
ExecStart=$NODE_BIN src/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=$REPO_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting meme-bot..."
systemctl daemon-reload
systemctl enable meme-bot
systemctl restart meme-bot

sleep 2
systemctl --no-pager status meme-bot || true

echo
echo "Done. Useful commands:"
echo "  sudo systemctl status meme-bot"
echo "  journalctl -u meme-bot -f"
echo "  sudo systemctl restart meme-bot   # after 'git pull' code changes"
