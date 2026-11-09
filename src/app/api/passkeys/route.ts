import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { PASSKEY_COOKIE, PasskeyError, passkeyConfig, passkeyStore } from "@/lib/passkeys"
import { checkPasskeyOrigin, passkeyFailure, passkeyJson } from "@/lib/passkey-http"

async function account() {
  // 開発環境でも、パスキーの変更には実際のログインを必須にする。
  const session = await auth()
  if (!session?.user?.name || session.user.name !== passkeyConfig().username) {
    throw new PasskeyError("ログインが必要です", 401)
  }
  return session.user.name
}

export async function GET() {
  try {
    const username = await account()
    const keys = await passkeyStore().list(username)
    return passkeyJson(keys.map(k => ({ id: k.id, name: k.name, createdAt: k.created_at })))
  } catch (error) { return passkeyFailure(error) }
}

export async function POST(request: NextRequest) {
  try {
    checkPasskeyOrigin(request)
    await account()
    const body = await request.json()
    if (!body?.response || typeof body.name !== "string" || body.name.length > 64) {
      throw new PasskeyError("パスキー名と認証結果を確認してください")
    }
    await passkeyStore().register(request.cookies.get(PASSKEY_COOKIE)?.value, body.response, body.name)
    const response = passkeyJson({ ok: true })
    response.cookies.delete(PASSKEY_COOKIE)
    return response
  } catch (error) { return passkeyFailure(error) }
}

export async function DELETE(request: NextRequest) {
  try {
    checkPasskeyOrigin(request)
    const username = await account()
    const body = await request.json()
    if (typeof body?.id !== "string" || !body.id) throw new PasskeyError("パスキーを指定してください")
    await passkeyStore().remove(body.id, username)
    return passkeyJson({ ok: true })
  } catch (error) { return passkeyFailure(error) }
}
