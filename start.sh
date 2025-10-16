#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

export NODE_ENV=production
cd "$APP_DIR"

LOG_DIR="$APP_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[$TIMESTAMP] Starting carsave backend..." >> "$LOG_DIR/start.log"

NODE_BIN="$(command -v node)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="/www/server/nodejs/v16.9.0/bin/node"
fi

"$NODE_BIN" dist/main.js >> "$LOG_DIR/app.log" 2>&1
