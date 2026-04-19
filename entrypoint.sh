#!/bin/bash
set -e

HASH_FILE=/cache/pkg_hash
CURRENT=$(md5sum /app/package.json | cut -d' ' -f1)

if [ "$(cat "$HASH_FILE" 2>/dev/null)" != "$CURRENT" ]; then
  echo "[entrypoint] package.json changed, running npm install..."
  npm install
  echo "$CURRENT" > "$HASH_FILE"
else
  echo "[entrypoint] package.json unchanged, skipping npm install"
fi

exec npm run dev
