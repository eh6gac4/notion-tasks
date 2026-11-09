"use client"

import { useState } from "react"
import { startAuthentication } from "@simplewebauthn/browser-v13"
import { usePasskeySupport } from "@/hooks/usePasskeySupport"
import { passkeyErrorMessage, passkeyRequest } from "@/lib/passkey-client"

export function PasskeyLogin({ callbackUrl }: { callbackUrl: string }) {
  const supported = usePasskeySupport()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function login() {
    setBusy(true)
    setError("")
    try {
      const optionsJSON = await passkeyRequest("/api/passkeys/options", "POST", { purpose: "authenticate" })
      const response = await startAuthentication({ optionsJSON })
      await passkeyRequest("/api/passkeys/login", "POST", { response })
      const target = new URL(callbackUrl, window.location.origin)
      window.location.assign(target.origin === window.location.origin ? target.href : "/")
    } catch (error) { setError(passkeyErrorMessage(error)) }
    finally { setBusy(false) }
  }

  if (!supported) return null
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-6">
      <button type="button" onClick={login} disabled={busy}
        className="w-full py-3 text-sm text-[var(--accent)] border border-[var(--border-strong)] disabled:opacity-40">
        {busy ? "認証中…" : "パスキーでログイン"}
      </button>
      {error && <p role="alert" className="mt-3 text-xs text-[var(--status-cancel)]">{error}</p>}
    </div>
  )
}
