import { NextResponse } from "next/server"
import { CHALLENGE_TTL, PASSKEY_COOKIE, PasskeyError, passkeyConfig } from "./passkeys"

export function checkPasskeyOrigin(request: Request) {
  if (request.headers.get("origin") !== passkeyConfig().origin) {
    throw new PasskeyError("このサイトから操作してください", 403)
  }
}

export function passkeyJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

export function challengeResponse(options: unknown, id: string) {
  const response = passkeyJson(options)
  response.cookies.set(PASSKEY_COOKIE, id, {
    httpOnly: true, secure: passkeyConfig().origin.startsWith("https:"), sameSite: "strict",
    path: "/", maxAge: CHALLENGE_TTL,
  })
  return response
}

export function passkeyFailure(error: unknown) {
  if (error instanceof PasskeyError) return passkeyJson({ error: error.message }, error.status)
  console.error("[passkeys] 操作に失敗しました", error)
  return passkeyJson({ error: "パスキーの操作に失敗しました。最初からやり直してください" }, 400)
}
