#!/usr/bin/env bash
# 本番ビルド成果物 (public/sw.js) のスモークテスト。
# `next build --webpack` + @serwist/next の webpack プラグインが sw.js を生成できて
# いるかを確認する。--webpack が非推奨化で外れると PWA が無言で壊れるため CI で監視する。
#
# 事前に `npm run build` が済んでいること（このスクリプトはビルドしない）。
set -euo pipefail
cd "$(dirname "$0")/.."

SW="public/sw.js"
[ -f "$SW" ] || { echo "FAIL: $SW が生成されていない (next build --webpack / Serwist plugin を確認)"; exit 1; }
grep -q "SKIP_WAITING" "$SW" || { echo "FAIL: $SW に SKIP_WAITING ハンドラが無い"; exit 1; }
grep -q 'addEventListener("message"' "$SW" || { echo "FAIL: $SW に message リスナが無い"; exit 1; }

# 実際に next start から配信されることも確認する。
PORT=3123
PORT=$PORT npx next start &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://localhost:$PORT/sw.js" && break
  sleep 1
done

code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/sw.js")
[ "$code" = "200" ] || { echo "FAIL: GET /sw.js => $code"; exit 1; }

echo "OK: /sw.js is generated and served"
