// @vitest-environment node
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeD1 } from "@/lib/store/__tests__/fakeD1"
import { PasskeyStore, passkeyConfig } from "../passkeys"

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }))

const origin = "https://tasks.example.com"
const rpHash = createHash("sha256").update("tasks.example.com").digest()
const b64 = (value: Buffer) => value.toString("base64url")

// 実際の P-256 鍵と WebAuthn のバイナリ形式を使い、署名検証をモックしない。
function authenticator() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const jwk = publicKey.export({ format: "jwk" })
  const id = randomBytes(32)
  const cose = Buffer.concat([
    Buffer.from([0xa5, 1, 2, 3, 0x26, 0x20, 1, 0x21, 0x58, 0x20]),
    Buffer.from(jwk.x!, "base64url"), Buffer.from([0x22, 0x58, 0x20]), Buffer.from(jwk.y!, "base64url"),
  ])
  function clientData(challenge: string, type: string, clientOrigin = origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin: clientOrigin, crossOrigin: false }))
  }
  return {
    id: b64(id),
    registration(challenge: string, clientOrigin = origin, uv = true) {
      const data = Buffer.concat([rpHash, Buffer.from([uv ? 0x45 : 0x41, 0, 0, 0, 0]), Buffer.alloc(16), Buffer.from([0, 32]), id, cose])
      const attestation = Buffer.concat([
        Buffer.from([0xa3, 0x63]), Buffer.from("fmt"), Buffer.from([0x64]), Buffer.from("none"),
        Buffer.from([0x68]), Buffer.from("authData"), Buffer.from([0x58, data.length]), data,
        Buffer.from([0x67]), Buffer.from("attStmt"), Buffer.from([0xa0]),
      ])
      return {
        id: b64(id), rawId: b64(id), type: "public-key" as const, clientExtensionResults: {},
        response: { clientDataJSON: b64(clientData(challenge, "webauthn.create", clientOrigin)), attestationObject: b64(attestation), transports: ["internal" as const] },
      }
    },
    assertion(challenge: string, count = 1, clientOrigin = origin, uv = true) {
      const counter = Buffer.alloc(4); counter.writeUInt32BE(count)
      const data = Buffer.concat([rpHash, Buffer.from([uv ? 5 : 1]), counter])
      const client = clientData(challenge, "webauthn.get", clientOrigin)
      const signature = sign("sha256", Buffer.concat([data, createHash("sha256").update(client).digest()]), privateKey)
      return {
        id: b64(id), rawId: b64(id), type: "public-key" as const, clientExtensionResults: {},
        response: { clientDataJSON: b64(client), authenticatorData: b64(data), signature: b64(signature) },
      }
    },
  }
}

describe("パスキー", () => {
  let store: PasskeyStore
  beforeEach(() => {
    vi.stubEnv("PASSKEY_ORIGIN", origin)
    vi.stubEnv("APP_USERNAME", "owner")
    store = new PasskeyStore(createFakeD1())
  })

  async function registeredKey() {
    const key = authenticator()
    const { id, options } = await store.registrationOptions()
    await store.register(id, key.registration(options.challenge), "iPhone")
    return key
  }

  it("登録から署名認証、削除まで実際の鍵で実行する", async () => {
    const key = await registeredKey()
    expect(await store.list("owner")).toMatchObject([{ id: key.id, name: "iPhone", counter: 0 }])
    const { id, options } = await store.authenticationOptions()
    expect(options.allowCredentials ?? []).toEqual([])
    expect(await store.authenticate(id, key.assertion(options.challenge))).toEqual({ id: "1", name: "owner" })
    expect(await store.list("owner")).toMatchObject([{ counter: 1 }])
    await store.remove(key.id, "owner")
    const next = await store.authenticationOptions()
    await expect(store.authenticate(next.id, key.assertion(next.options.challenge, 2))).rejects.toThrow("登録されていない")
  })

  it("検証済みの応答を再送できない", async () => {
    const key = await registeredKey()
    const { id, options } = await store.authenticationOptions()
    const response = key.assertion(options.challenge)
    await store.authenticate(id, response)
    await expect(store.authenticate(id, response)).rejects.toThrow("有効期限")
  })

  it("別ブラウザのチャレンジ、期限切れ、用途の取り違えを拒否する", async () => {
    const key = await registeredKey()
    const first = await store.authenticationOptions()
    const second = await store.authenticationOptions()
    await expect(store.authenticate(first.id, key.assertion(second.options.challenge))).rejects.toThrow()
    await expect(store.consume(undefined, "authenticate", "owner")).rejects.toThrow()
    const registration = await store.registrationOptions()
    await expect(store.consume(registration.id, "authenticate", "owner")).rejects.toThrow()
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 301_000)
    await expect(store.authenticate(second.id, key.assertion(second.options.challenge))).rejects.toThrow("有効期限")
    vi.restoreAllMocks()
  })

  it("登録時に別 origin と本人確認なしの認証器を拒否する", async () => {
    const key = authenticator()
    for (const [clientOrigin, uv] of [["https://evil.example", true], [origin, false]] as const) {
      const { id, options } = await store.registrationOptions()
      await expect(store.register(id, key.registration(options.challenge, clientOrigin, uv), "test")).rejects.toThrow()
    }
    expect(await store.list("owner")).toEqual([])
  })

  it("認証時に別 origin、本人確認なし、不正署名、カウンターの逆行を拒否する", async () => {
    const key = await registeredKey()
    for (const [clientOrigin, uv] of [["https://evil.example", true], [origin, false]] as const) {
      const { id, options } = await store.authenticationOptions()
      await expect(store.authenticate(id, key.assertion(options.challenge, 1, clientOrigin, uv))).rejects.toThrow()
    }
    const bad = await store.authenticationOptions()
    const response = key.assertion(bad.options.challenge)
    const signature = Buffer.from(response.response.signature, "base64url")
    signature[signature.length - 1] ^= 1
    response.response.signature = b64(signature)
    await expect(store.authenticate(bad.id, response)).rejects.toThrow()
    const good = await store.authenticationOptions()
    await store.authenticate(good.id, key.assertion(good.options.challenge, 2))
    const old = await store.authenticationOptions()
    await expect(store.authenticate(old.id, key.assertion(old.options.challenge, 1))).rejects.toThrow()
  })

  it("同期型パスキーのゼロカウンターを許可する", async () => {
    const key = await registeredKey()
    for (let i = 0; i < 2; i++) {
      const { id, options } = await store.authenticationOptions()
      await expect(store.authenticate(id, key.assertion(options.challenge, 0))).resolves.toMatchObject({ id: "1" })
    }
  })

  it("別アカウントの鍵を参照・削除・認証できない", async () => {
    const key = await registeredKey()
    await store.remove(key.id, "other")
    expect(await store.list("other")).toEqual([])
    expect(await store.list("owner")).toHaveLength(1)
    vi.stubEnv("APP_USERNAME", "other")
    const { id, options } = await store.authenticationOptions()
    await expect(store.authenticate(id, key.assertion(options.challenge))).rejects.toThrow("登録されていない")
  })

  it("安全な origin の設定だけを許可する", () => {
    vi.stubEnv("PASSKEY_ORIGIN", "http://tasks.example.com")
    expect(() => passkeyConfig()).toThrow("HTTPS")
    vi.stubEnv("PASSKEY_ORIGIN", "http://localhost:3000")
    expect(passkeyConfig()).toMatchObject({ rpID: "localhost", origin: "http://localhost:3000" })
  })
})
