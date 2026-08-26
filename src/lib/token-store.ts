import { getCloudflareContext } from "@opennextjs/cloudflare"

const KV_KEY = "google_refresh_token"

// Gmail の refresh token を KV に永続化する。GOOGLE_REFRESH_TOKEN env は
// 初回ブートストラップ用の値として残し、KV に値が書き込まれたらそちらを優先する。
// 再認可(src/app/api/google/callback/route.ts)で得た新しい token は KV にのみ書く。
export async function getGoogleRefreshToken(): Promise<string> {
  const stored = await getCloudflareContext().env.TOKEN_STORE.get(KV_KEY)
  return stored ?? process.env.GOOGLE_REFRESH_TOKEN ?? ""
}

export async function setGoogleRefreshToken(token: string): Promise<void> {
  await getCloudflareContext().env.TOKEN_STORE.put(KV_KEY, token)
}
