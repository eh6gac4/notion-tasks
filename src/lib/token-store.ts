import { getCloudflareContext } from "@opennextjs/cloudflare"

const TOKEN_KEY = "google_refresh_token"

// Gmail の refresh token を D1(app_tokens)に永続化する。GOOGLE_REFRESH_TOKEN env は
// 初回ブートストラップ用の値として残し、D1 に値が書き込まれたらそちらを優先する。
// 再認可(src/app/api/google/callback/route.ts)で得た新しい token は D1 にのみ書く。
//
// 保存先が KV ではなく D1 なのは read-after-write 一貫性のため。KV は read した
// キーをエッジに最大 60 秒キャッシュし、put ではそれを無効化しないので、
// 「再認可 → 即リダイレクト → /mail が読む」経路で失効済みの旧トークンを
// 読み続けてしまい、再連携が永久に反映されない状態になっていた。

async function readStoredToken(): Promise<string | undefined> {
  const db = getCloudflareContext().env.DB
  if (!db) {
    // env フォールバックがあるため読み取りは落とさないが、この状態では再認可しても
    // 保存が効かない(= 今回直した不具合と同じ症状に見える)ので必ず記録する。
    console.error("[token-store] D1 バインディング DB がありません。env の値にフォールバックします")
    return undefined
  }
  const row = await db.prepare("SELECT value FROM app_tokens WHERE key = ?").bind(TOKEN_KEY).first<{ value: string }>()
  return row?.value
}

export async function getGoogleRefreshToken(): Promise<string> {
  const stored = await readStoredToken()
  return stored ?? process.env.GOOGLE_REFRESH_TOKEN ?? ""
}

export async function setGoogleRefreshToken(token: string): Promise<void> {
  const db = getCloudflareContext().env.DB
  if (!db) {
    throw new Error("[token-store] D1 バインディング DB がありません。refresh token を保存できません")
  }
  await db
    .prepare(
      "INSERT INTO app_tokens (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(TOKEN_KEY, token, new Date().toISOString())
    .run()
}
