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

# ローカルの git worktree では node_modules が worktree の外を指す絶対パスの symlink
# になっている。Turbopack は「マウントされた木の外を指す symlink」を解決できないため、
# worktree だけをマウントすると起動に失敗する。worktree と symlink 先の共通の祖先を
# まるごとマウントして、コンテナ内でも同じ絶対パスで解決できるようにする。
MOUNTS=(-v "$ROOT:$ROOT:z")
NM="$(readlink -f node_modules 2>/dev/null || echo "$ROOT/node_modules")"
if [ "$NM" != "$ROOT/node_modules" ]; then
  ANCESTOR="$(dirname "$NM")"
  while [ "${ROOT#"$ANCESTOR"}" = "$ROOT" ] && [ "$ANCESTOR" != "/" ]; do
    ANCESTOR="$(dirname "$ANCESTOR")"
  done
  # "/" まで登った = worktree と node_modules に共通の親が無い。ここでホストの
  # ルート全体をコンテナへ渡すのは隔離を捨てるのと同じなので、黙って続けない。
  if [ "$ANCESTOR" = "/" ]; then
    echo "node_modules ($NM) が worktree ($ROOT) と共通の親を持たないため、" >&2
    echo "コンテナへ安全にマウントできません。node_modules を worktree 内に置いてください。" >&2
    exit 1
  fi
  MOUNTS=(-v "$ANCESTOR:$ANCESTOR:z")
fi

# コンテナ内も呼び出したユーザーで動かす。root のままだと .next/ や
# test-results/ が root 所有で残り、以降ホストの dev サーバーが
# 「lockfile を作れない」で起動しなくなる。
exec docker run --rm --network host \
  "${MOUNTS[@]}" -w "$ROOT" \
  --user "$(id -u):$(id -g)" \
  -e CI=1 -e HOME=/tmp \
  -e APP_USERNAME="${APP_USERNAME:-ci-user}" \
  -e APP_PASSWORD="${APP_PASSWORD:-ci-pass}" \
  -e NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-ci-playwright-not-a-real-secret}" \
  -e AUTH_SECRET="${AUTH_SECRET:-ci-playwright-not-a-real-secret}" \
  -e NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}" \
  "$IMAGE" \
  ./node_modules/.bin/playwright test e2e/snapshot.spec.ts \
    --project="iPhone 15 (touch)" "$@"
