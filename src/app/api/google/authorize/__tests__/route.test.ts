import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/require-auth", () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }))

const { GET } = await import("../route")
const { NextRequest } = await import("next/server")

describe("GET /api/google/authorize", () => {
  it("Google の同意画面へリダイレクトし、必要なパラメータを付与する", async () => {
    const req = new NextRequest("https://example.com/api/google/authorize")
    const res = await GET(req)

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location")!)
    expect(location.origin).toBe("https://accounts.google.com")
    expect(location.searchParams.get("access_type")).toBe("offline")
    expect(location.searchParams.get("prompt")).toBe("consent")
    expect(location.searchParams.get("redirect_uri")).toBe("https://example.com/api/google/callback")
    expect(location.searchParams.get("state")).toBeTruthy()
  })

  it("state を httpOnly cookie に保存する", async () => {
    const req = new NextRequest("https://example.com/api/google/authorize")
    const res = await GET(req)

    const setCookie = res.headers.get("set-cookie")!
    expect(setCookie).toContain("google_oauth_state=")
    expect(setCookie).toContain("HttpOnly")
  })
})
