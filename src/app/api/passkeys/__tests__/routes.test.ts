import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { auth, signIn, store } = vi.hoisted(() => ({
  auth: vi.fn(), signIn: vi.fn(),
  store: { list: vi.fn(), register: vi.fn(), remove: vi.fn(), registrationOptions: vi.fn(), authenticationOptions: vi.fn() },
}))
vi.mock("@/auth", () => ({ auth, signIn }))
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }))
vi.mock("@/lib/passkeys", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/passkeys")>(), passkeyStore: () => store,
}))
import { GET, POST, DELETE } from "../route"
import { POST as options } from "../options/route"
import { POST as login } from "../login/route"

const origin = "https://tasks.example.com"
function request(path = "", body: unknown = {}, requestOrigin: string | null = origin, method = "POST") {
  const headers = new Headers({ "Content-Type": "application/json", cookie: "passkey_challenge=browser-secret" })
  if (requestOrigin) headers.set("origin", requestOrigin)
  return new NextRequest(`${origin}/api/passkeys${path}`, { method, headers, body: JSON.stringify(body) })
}

describe("パスキー API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("PASSKEY_ORIGIN", origin)
    vi.stubEnv("APP_USERNAME", "owner")
    auth.mockResolvedValue({ user: { name: "owner" } })
    store.list.mockResolvedValue([{ id: "key", name: "iPhone", created_at: "2026-11-09", public_key: "secret", counter: 1 }])
    store.registrationOptions.mockResolvedValue({ id: "random-id", options: { challenge: "registration" } })
    store.authenticationOptions.mockResolvedValue({ id: "random-id", options: { challenge: "authentication" } })
  })

  it("未ログインの一覧・登録・削除・登録オプション取得を拒否する", async () => {
    auth.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect((await POST(request("", { response: {}, name: "key" }))).status).toBe(401)
    expect((await DELETE(request("", { id: "key" }, origin, "DELETE"))).status).toBe(401)
    expect((await options(request("/options", { purpose: "register" }))).status).toBe(401)
    expect(store.register).not.toHaveBeenCalled()
    expect(store.remove).not.toHaveBeenCalled()
    expect(store.registrationOptions).not.toHaveBeenCalled()
  })

  it("異なるアカウントには操作させない", async () => {
    auth.mockResolvedValue({ user: { name: "other" } })
    expect((await GET()).status).toBe(401)
    expect((await options(request("/options", { purpose: "register" }))).status).toBe(401)
  })

  it("別 origin と origin のない変更要求を拒否する", async () => {
    for (const badOrigin of ["https://evil.example", null]) {
      expect((await POST(request("", {}, badOrigin))).status).toBe(403)
      expect((await DELETE(request("", {}, badOrigin, "DELETE"))).status).toBe(403)
      expect((await options(request("/options", { purpose: "authenticate" }, badOrigin))).status).toBe(403)
      expect((await login(request("/login", {}, badOrigin))).status).toBe(403)
    }
    expect(signIn).not.toHaveBeenCalled()
  })

  it("未ログインで認証オプションを発行し、安全な cookie と no-store を付ける", async () => {
    auth.mockResolvedValue(null)
    const response = await options(request("/options", { purpose: "authenticate" }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ challenge: "authentication" })
    expect(response.headers.get("cache-control")).toBe("no-store")
    const cookie = response.headers.get("set-cookie")!
    for (const flag of ["HttpOnly", "Secure", "SameSite=strict", "Max-Age=300"]) expect(cookie).toContain(flag)
  })

  it("一覧には公開鍵を含めず、登録はブラウザの cookie に結びつける", async () => {
    const response = await GET()
    expect(await response.json()).toEqual([{ id: "key", name: "iPhone", createdAt: "2026-11-09" }])
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect((await POST(request("", { response: { id: "key" }, name: "iPhone" }))).status).toBe(200)
    expect(store.register).toHaveBeenCalledWith("browser-secret", { id: "key" }, "iPhone")
  })

  it("削除対象をセッションのアカウントに限定する", async () => {
    expect((await DELETE(request("", { id: "key", username: "other" }, origin, "DELETE"))).status).toBe(200)
    expect(store.remove).toHaveBeenCalledWith("key", "owner")
  })

  it("認証の検証は Auth.js provider に委ねる", async () => {
    const response = { id: "key", response: { signature: "signature" } }
    expect((await login(request("/login", { response }))).status).toBe(200)
    expect(signIn).toHaveBeenCalledWith("passkey", { response: JSON.stringify(response), redirect: false })
  })
})
