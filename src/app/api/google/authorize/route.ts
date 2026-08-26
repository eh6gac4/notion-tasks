import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { config } from "@/config"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify"
const STATE_COOKIE = "google_oauth_state"

export async function GET(request: NextRequest) {
  await requireAuth()

  const state = crypto.randomUUID()
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
