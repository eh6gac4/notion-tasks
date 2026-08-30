#!/usr/bin/env bash
# 視覚回帰 (e2e/snapshot.spec.ts) を Playwright 公式コンテナ内で実行する。
# baseline の描画環境を CI・ローカルで一致させるのが目的。
#
#   ./scripts/visual-regression.sh                 # 照合のみ
#   ./scripts/visual-regression.sh --update-snapshots  # baseline 再生成
#
# playwright.config.ts の webServer は CI=1 のとき `npm run dev` を起動する。
set -euo pipefail

# @playwright/test のバージョンに合わせる。package.json 更新時はここも更新する。
IMAGE="mcr.microsoft.com/playwright:v1.59.1-noble"

cd "$(dirname "$0")/.."
ROOT="$PWD"

# ローカルの git worktree では node_modules が絶対パスの symlink になっている場合がある。
# その場合は実体もコンテナへマウントする。
MOUNTS=(-v "$ROOT:$ROOT:z")
NM="$(readlink -f node_modules 2>/dev/null || echo "$ROOT/node_modules")"
if [ "$NM" != "$ROOT/node_modules" ]; then
  MOUNTS+=(-v "$NM:$ROOT/node_modules:z")
fi

exec docker run --rm --network host \
  "${MOUNTS[@]}" -w "$ROOT" \
  -e CI=1 -e HOME=/tmp \
  -e APP_USERNAME="${APP_USERNAME:-ci-user}" \
  -e APP_PASSWORD="${APP_PASSWORD:-ci-pass}" \
  -e NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-ci-playwright-not-a-real-secret}" \
  -e AUTH_SECRET="${AUTH_SECRET:-ci-playwright-not-a-real-secret}" \
  -e NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}" \
  "$IMAGE" \
  ./node_modules/.bin/playwright test e2e/snapshot.spec.ts \
    --project="iPhone 15 (touch)" "$@"
