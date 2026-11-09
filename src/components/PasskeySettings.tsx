"use client"

import { useEffect, useState } from "react"
import { startRegistration } from "@simplewebauthn/browser-v13"
import { usePasskeySupport } from "@/hooks/usePasskeySupport"
import { passkeyErrorMessage, passkeyRequest } from "@/lib/passkey-client"

type Key = { id: string; name: string; createdAt: string }

export function PasskeySettings() {
  const [keys, setKeys] = useState<Key[]>([])
  const [name, setName] = useState("")
  const [ready, setReady] = useState(false)
  const supported = usePasskeySupport()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    passkeyRequest("/api/passkeys", "GET").then(data => {
      if (active) { setKeys(data); setReady(true) }
    }).catch(error => { if (active) setError(passkeyErrorMessage(error)) })
    return () => { active = false }
  }, [])

  async function register() {
    setBusy(true); setError(""); setMessage("")
    try {
      const optionsJSON = await passkeyRequest("/api/passkeys/options", "POST", { purpose: "register" })
      const response = await startRegistration({ optionsJSON })
      await passkeyRequest("/api/passkeys", "POST", { response, name: name.trim() || "パスキー" })
      setKeys(await passkeyRequest("/api/passkeys", "GET"))
      setName(""); setMessage("パスキーを登録しました")
    } catch (error) { setError(passkeyErrorMessage(error)) }
    finally { setBusy(false) }
  }

  async function remove(key: Key) {
    if (!window.confirm(`「${key.name}」を削除しますか？ このパスキーではログインできなくなります。`)) return
    setBusy(true); setError(""); setMessage("")
    try {
      await passkeyRequest("/api/passkeys", "DELETE", { id: key.id })
      setKeys(keys.filter(k => k.id !== key.id)); setMessage("パスキーを削除しました")
    } catch (error) { setError(passkeyErrorMessage(error)) }
    finally { setBusy(false) }
  }

  return (
    <section aria-label="パスキー" className="py-4 border-t border-[var(--border)] space-y-3">
      <h3 className="text-sm text-[var(--text)]">パスキー</h3>
      <p className="text-xs text-[var(--text-faint)]">指紋・顔認証や端末の PIN でログインできます。パスワードも引き続き使えます。</p>
      {!supported && <p className="text-xs text-[var(--text-dim)]">パスキーの登録には対応ブラウザと HTTPS 接続が必要です。</p>}
      {ready && <>
        {keys.length === 0 && <p className="text-xs text-[var(--text-dim)]">登録済みのパスキーはありません</p>}
        <ul className="space-y-3">
          {keys.map(key => <li key={key.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 break-words text-[var(--text)]">{key.name}
              <span className="block text-xs text-[var(--text-faint)]">登録日 {new Date(key.createdAt).toLocaleDateString("ja-JP")}</span>
            </span>
            <button type="button" disabled={busy} onClick={() => remove(key)} aria-label={`${key.name}を削除`}
              className="shrink-0 p-2 text-xs text-[var(--status-cancel)] disabled:opacity-40">削除</button>
          </li>)}
        </ul>
        {supported && <>
          <label className="block text-xs text-[var(--text-dim)]" htmlFor="passkey-name">パスキー名（任意）</label>
          <input id="passkey-name" value={name} onChange={e => setName(e.target.value)} maxLength={64} disabled={busy}
            placeholder="例: iPhone" className="w-full p-3 text-sm bg-[var(--bg)] text-[var(--text)] border border-[var(--border-strong)]" />
          <button type="button" disabled={busy} onClick={register}
            className="w-full p-3 text-sm text-[var(--accent)] border border-[var(--border-strong)] disabled:opacity-40">
            {busy ? "処理中…" : "パスキーを登録"}
          </button>
        </>}
      </>}
      {error && <p role="alert" className="text-xs text-[var(--status-cancel)]">{error}</p>}
      {message && <p role="status" className="text-xs text-[var(--text-dim)]">{message}</p>}
    </section>
  )
}
