#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

export NODE_ENV=production
cd "$APP_DIR"

LOG_DIR="$APP_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[$TIMESTAMP] Starting carsave backend..." >> "$LOG_DIR/start.log"

NODE_BIN="$(command -v node)"
# Fall back to the BT panel default Node path if PATH is empty for www user
if [ -z "$NODE_BIN" ] && [ -x "/www/server/nodejs/nodejs-default/bin/node" ]; then
  NODE_BIN="/www/server/nodejs/nodejs-default/bin/node"
fi

# Explicit final fallback to the currently provisioned version
if [ -z "$NODE_BIN" ] && [ -x "/www/server/nodejs/v18.14.2/bin/node" ]; then
  NODE_BIN="/www/server/nodejs/v18.14.2/bin/node"
fi

if [ -z "$NODE_BIN" ]; then
  echo "[$TIMESTAMP] ERROR: node binary not found" >> "$LOG_DIR/start.log"
  exit 1
fi

"$NODE_BIN" dist/main.js >> "$LOG_DIR/app.log" 2>&1
