import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

// gmail.ts の import 鎖(isDevMode → @/auth → next-auth)を断ち切るためモックする。
// gmail-body.test.ts と同じ方針。
vi.mock("@/lib/require-auth", () => ({
  isDevMode: () => false,
}))

vi.mock("@/lib/token-store", () => ({
  getGoogleRefreshToken: vi.fn().mockResolvedValue("stored-refresh-token"),
  setGoogleRefreshToken: vi.fn(),
}))

const { getMails, GmailReauthRequiredError } = await import("@/lib/gmail")
const { getGoogleRefreshToken } = await import("@/lib/token-store")

describe("getAccessToken (getMails 経由)", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.mocked(getGoogleRefreshToken).mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("token エンドポイントが invalid_grant を返すと GmailReauthRequiredError を投げる", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }),
    }) as unknown as typeof fetch

    await expect(getMails("inbox")).rejects.toThrow(GmailReauthRequiredError)
  })

  it("token エンドポイントが一時的な 5xx を返した場合は GmailReauthRequiredError にしない", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    }) as unknown as typeof fetch

    await expect(getMails("inbox")).rejects.not.toThrow(GmailReauthRequiredError)
  })

  it("保存された refresh token を使ってトークン取得を試みる", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "error",
    }) as unknown as typeof fetch

    await expect(getMails("inbox")).rejects.toThrow()
    expect(getGoogleRefreshToken).toHaveBeenCalled()
  })
})
