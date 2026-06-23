#!/usr/bin/env bash
# Idempotent provisioning for Claude Code web sessions (and fresh clones):
# install deps if missing, then create + seed the SQLite DB if missing.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "[web-setup] installing dependencies…"
  npm install --no-audit --no-fund
fi

if [ ! -f prisma/dev.db ]; then
  echo "[web-setup] creating + seeding database…"
  npm run db:reset
fi

echo "[web-setup] ready — run 'npm run dev'."
