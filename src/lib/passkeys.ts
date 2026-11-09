import { getCloudflareContext } from "@opennextjs/cloudflare"
import type { D1Database } from "@cloudflare/workers-types"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server-v13"

export const PASSKEY_COOKIE = "passkey_challenge"
export const CHALLENGE_TTL = 5 * 60

export class PasskeyError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function passkeyConfig() {
  const value = process.env.PASSKEY_ORIGIN ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  if (!value || !process.env.APP_USERNAME) {
    throw new PasskeyError("パスキーの環境設定が必要です", 503)
  }
  const url = new URL(value)
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new PasskeyError("パスキーには HTTPS が必要です", 503)
  }
  return { origin: url.origin, rpID: url.hostname, username: process.env.APP_USERNAME }
}

type PasskeyRow = {
  id: string
  username: string
  public_key: string
  counter: number
  transports: string
  name: string
  created_at: string
}

export function passkeyStore() {
  const db = getCloudflareContext().env.DB
  if (!db) throw new PasskeyError("パスキーの保存先が設定されていません", 503)
  return new PasskeyStore(db)
}

export class PasskeyStore {
  constructor(private db: D1Database) {}

  async list(username: string) {
    const { results } = await this.db.prepare("SELECT * FROM passkeys WHERE username = ? ORDER BY created_at")
      .bind(username).all<PasskeyRow>()
    return results
  }

  async remove(id: string, username: string) {
    await this.db.prepare("DELETE FROM passkeys WHERE id = ? AND username = ?").bind(id, username).run()
  }

  async challenge(challenge: string, purpose: "register" | "authenticate", username: string) {
    const id = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    await this.db.batch([
      this.db.prepare("DELETE FROM passkey_challenges WHERE expires_at <= ?").bind(now),
      this.db.prepare("INSERT INTO passkey_challenges (id, challenge, purpose, username, expires_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, challenge, purpose, username, now + CHALLENGE_TTL),
    ])
    return id
  }

  async consume(id: string | undefined, purpose: "register" | "authenticate", username: string) {
    if (!id) throw new PasskeyError("認証を最初からやり直してください")
    const row = await this.db.prepare(
      "DELETE FROM passkey_challenges WHERE id = ? AND purpose = ? AND username = ? AND expires_at > ? RETURNING challenge",
    ).bind(id, purpose, username, Math.floor(Date.now() / 1000)).first<{ challenge: string }>()
    if (!row) throw new PasskeyError("認証の有効期限が切れました。やり直してください")
    return row.challenge
  }

  async registrationOptions() {
    const { rpID, username } = passkeyConfig()
    const existing = await this.list(username)
    const userID = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(username)))
    const options = await generateRegistrationOptions({
      rpName: "notion-tasks", rpID, userName: username, userID,
      attestationType: "none",
      excludeCredentials: existing.map(p => ({ id: p.id, transports: JSON.parse(p.transports) })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    })
    return { options, id: await this.challenge(options.challenge, "register", username) }
  }

  async register(id: string | undefined, response: RegistrationResponseJSON, name: string) {
    const { origin, rpID, username } = passkeyConfig()
    const expectedChallenge = await this.consume(id, "register", username)
    const result = await verifyRegistrationResponse({
      response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
    })
    if (!result.verified || !result.registrationInfo) throw new PasskeyError("パスキーを検証できませんでした")
    const { credential } = result.registrationInfo
    await this.db.prepare(
      "INSERT INTO passkeys (id, username, public_key, counter, transports, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(credential.id, username, Buffer.from(credential.publicKey).toString("base64url"), credential.counter,
      JSON.stringify(credential.transports ?? []), name.trim().slice(0, 64) || "パスキー", new Date().toISOString()).run()
  }

  async authenticationOptions() {
    const { rpID, username } = passkeyConfig()
    // Discoverable credentials を使い、未認証の端末には登録済み ID を返さない。
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" })
    return { options, id: await this.challenge(options.challenge, "authenticate", username) }
  }

  async authenticate(id: string | undefined, response: AuthenticationResponseJSON) {
    const { origin, rpID, username } = passkeyConfig()
    const expectedChallenge = await this.consume(id, "authenticate", username)
    const key = await this.db.prepare("SELECT * FROM passkeys WHERE id = ? AND username = ?")
      .bind(response.id, username).first<PasskeyRow>()
    if (!key) throw new PasskeyError("登録されていないパスキーです")
    const result = await verifyAuthenticationResponse({
      response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      credential: {
        id: key.id, publicKey: new Uint8Array(Buffer.from(key.public_key, "base64url")), counter: key.counter,
        transports: JSON.parse(key.transports) as AuthenticatorTransportFuture[],
      },
    })
    if (!result.verified) throw new PasskeyError("パスキーを検証できませんでした")
    // 削除や並行ログインと競合した場合も、古いカウンターでセッションを発行しない。
    const updated = await this.db.prepare(
      "UPDATE passkeys SET counter = ? WHERE id = ? AND username = ? AND counter = ? RETURNING id",
    ).bind(result.authenticationInfo.newCounter, key.id, username, key.counter).first()
    if (!updated) throw new PasskeyError("認証を最初からやり直してください")
    return { id: "1", name: username }
  }
}
