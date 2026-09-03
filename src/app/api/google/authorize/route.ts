import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { config } from "@/config"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify"
const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  await requireAuth()

  // 有効な state cookie が既にあれば使い回す。この経路が二重に実行されると、
  // リクエストごとに新しい state を作る実装では cookie と認可 URL の state が
  // ズレて invalid_state になる(実際に Service Worker 経由で二重実行されていた。
  // 経路自体は src/app/sw.ts でキャッシュ層から外して塞いである)。
  // 同じ値を返せば、何回実行されても両者は必ず一致する。
  const state = request.cookies.get(STATE_COOKIE)?.value ?? crypto.randomUUID()
  const redirectUri = new URL("/api/google/callback", request.nextUrl.origin).toString()

  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set("client_id", config.google.clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", GMAIL_SCOPE)
  // refresh_token を確実に発行させるため offline + consent を必須にする。
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)

  const response = NextResponse.redirect(url)
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  })
  return response
}
