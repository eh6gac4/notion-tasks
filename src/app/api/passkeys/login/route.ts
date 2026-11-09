import { type NextRequest, NextResponse } from "next/server"
import { AuthError } from "next-auth"
import { signIn } from "@/auth"
import { PASSKEY_COOKIE, PasskeyError } from "@/lib/passkeys"
import { checkPasskeyOrigin, passkeyFailure } from "@/lib/passkey-http"

export async function POST(request: NextRequest) {
  try {
    checkPasskeyOrigin(request)
    const { response } = await request.json()
    if (!response || JSON.stringify(response).length > 20000) throw new PasskeyError("認証結果を確認してください")
    // 検証を Credentials provider 内で行い、既存と同じ Auth.js セッションを発行する。
    await signIn("passkey", { response: JSON.stringify(response), redirect: false })
    const result = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
    result.cookies.delete(PASSKEY_COOKIE)
    return result
  } catch (error) {
    if (error instanceof AuthError) return passkeyFailure(new PasskeyError("パスキーで認証できませんでした", 401))
    return passkeyFailure(error)
  }
}
