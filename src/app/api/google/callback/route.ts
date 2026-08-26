import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { config } from "@/config"
import { setGoogleRefreshToken } from "@/lib/token-store"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  await requireAuth()

  // state cookie は成功・失敗いずれの結末でも使い切ったら削除する。
  const redirectToMail = (reauthError?: string) => {
    const url = new URL("/mail", request.nextUrl.origin)
    if (reauthError) url.searchParams.set("reauth", reauthError)
    const response = NextResponse.redirect(url)
    // authorize/route.ts で発行した cookie と同じ path を指定しないと
    // ブラウザが削除用 Set-Cookie を別 cookie として扱い、消えない。
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/google" })
    return response
  }

  const params = request.nextUrl.searchParams
  if (params.get("error")) {
    return redirectToMail("denied")
  }

  const code = params.get("code")
  const state = params.get("state")
  const savedState = request.cookies.get(STATE_COOKIE)?.value
  if (!savedState || state !== savedState) {
    // cookie が無い(セッション切れ・別ブラウザ)場合と state 不一致(CSRF/リプレイ)を
    // 区別せず同じエラーにまとめる。ユーザーへの案内は「もう一度やり直す」で共通のため。
    return redirectToMail("invalid_state")
  }
  if (!code) {
    return redirectToMail("invalid_state")
  }

  const redirectUri = new URL("/api/google/callback", request.nextUrl.origin).toString()
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) {
    console.error("[google-oauth] token 交換に失敗しました", res.status, await res.text())
    return redirectToMail("token_exchange_failed")
  }

  const data = (await res.json()) as { refresh_token?: string }
  if (!data.refresh_token) {
    // prompt=consent を付けているため通常は発行されるが、既に許可済みで
    // Google 側が省略するケースへの保険。
    console.error("[google-oauth] refresh_token がレスポンスに含まれていません")
    return redirectToMail("no_refresh_token")
  }

  await setGoogleRefreshToken(data.refresh_token)
  return redirectToMail()
}
