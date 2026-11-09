import { auth } from "@/auth"
import { PasskeyError, passkeyConfig, passkeyStore } from "@/lib/passkeys"
import { challengeResponse, checkPasskeyOrigin, passkeyFailure } from "@/lib/passkey-http"

export async function POST(request: Request) {
  try {
    checkPasskeyOrigin(request)
    const { purpose } = await request.json()
    if (purpose !== "register" && purpose !== "authenticate") throw new PasskeyError("操作を確認してください")
    if (purpose === "register") {
      const session = await auth()
      if (!session?.user?.name || session.user.name !== passkeyConfig().username) {
        throw new PasskeyError("ログインが必要です", 401)
      }
    }
    const store = passkeyStore()
    const { options, id } = purpose === "register"
      ? await store.registrationOptions() : await store.authenticationOptions()
    return challengeResponse(options, id)
  } catch (error) { return passkeyFailure(error) }
}
