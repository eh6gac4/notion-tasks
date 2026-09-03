import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/require-auth", () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }))

const setGoogleRefreshToken = vi.fn()
vi.mock("@/lib/token-store", () => ({ setGoogleRefreshToken }))

const fetchAccessToken = vi.fn()
const clearAccessTokenCache = vi.fn()
vi.mock("@/lib/gmail", () => ({ fetchAccessToken, clearAccessTokenCache }))

const { GET } = await import("../route")
const { NextRequest } = await import("next/server")

function requestWithState(url: string, cookieState?: string) {
  const req = new NextRequest(url)
  if (cookieState) req.cookies.set("google_oauth_state", cookieState)
  return req
}

describe("GET /api/google/callback", () => {
  beforeEach(() => {
    setGoogleRefreshToken.mockReset()
    fetchAccessToken.mockReset()
    fetchAccessToken.mockResolvedValue({ token: "access-token", expiresIn: 3600 })
    clearAccessTokenCache.mockReset()
    global.fetch = vi.fn()
  })

  it("state が cookie と一致しない場合は token 交換せず /mail?reauth=invalid_state へ戻す", async () => {
    const req = requestWithState(
      "https://example.com/api/google/callback?code=abc&state=wrong",
      "correct-state",
    )
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).searchParams.get("reauth")).toBe("invalid_state")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("Google が error を返した場合は /mail?reauth=denied へ戻す", async () => {
    const req = requestWithState("https://example.com/api/google/callback?error=access_denied")
    const res = await GET(req)

    expect(new URL(res.headers.get("location")!).searchParams.get("reauth")).toBe("denied")
  })

  it("state 一致・token 交換成功時は refresh_token を保存し /mail へ戻す", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: "new-refresh-token" }),
    }) as unknown as typeof fetch

    const req = requestWithState(
      "https://example.com/api/google/callback?code=abc&state=match",
      "match",
    )
    const res = await GET(req)

    expect(fetchAccessToken).toHaveBeenCalledWith("new-refresh-token")
    expect(setGoogleRefreshToken).toHaveBeenCalledWith("new-refresh-token")
    expect(clearAccessTokenCache).toHaveBeenCalled()
    expect(new URL(res.headers.get("location")!).pathname).toBe("/mail")
    expect(new URL(res.headers.get("location")!).searchParams.get("reauth")).toBeNull()
  })

  it("取得した refresh_token で疎通確認できない場合は保存せず reauth=verify_failed を付ける", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: "broken-refresh-token" }),
    }) as unknown as typeof fetch
    fetchAccessToken.mockRejectedValue(new Error("invalid_grant"))

    const req = requestWithState(
      "https://example.com/api/google/callback?code=abc&state=match",
      "match",
    )
    const res = await GET(req)

    expect(setGoogleRefreshToken).not.toHaveBeenCalled()
    expect(new URL(res.headers.get("location")!).searchParams.get("reauth")).toBe("verify_failed")
  })

  it("レスポンスに refresh_token が無い場合は保存せず reauth=no_refresh_token を付ける", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const req = requestWithState(
      "https://example.com/api/google/callback?code=abc&state=match",
      "match",
    )
    const res = await GET(req)

    expect(setGoogleRefreshToken).not.toHaveBeenCalled()
    expect(new URL(res.headers.get("location")!).searchParams.get("reauth")).toBe("no_refresh_token")
  })
})
