import { describe, expect, it, vi, beforeEach } from "vitest"

const kvGet = vi.fn()
const kvPut = vi.fn()

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { TOKEN_STORE: { get: kvGet, put: kvPut } } }),
}))

const { getGoogleRefreshToken, setGoogleRefreshToken } = await import("@/lib/token-store")

describe("token-store", () => {
  beforeEach(() => {
    kvGet.mockReset()
    kvPut.mockReset()
  })

  it("KV に値があればそれを返す", async () => {
    kvGet.mockResolvedValue("kv-token")
    await expect(getGoogleRefreshToken()).resolves.toBe("kv-token")
  })

  it("KV が空なら env の GOOGLE_REFRESH_TOKEN にフォールバックする", async () => {
    kvGet.mockResolvedValue(null)
    await expect(getGoogleRefreshToken()).resolves.toBe("test-google-refresh-token-placeholder")
  })

  it("setGoogleRefreshToken は KV に書き込む", async () => {
    await setGoogleRefreshToken("new-token")
    expect(kvPut).toHaveBeenCalledWith("google_refresh_token", "new-token")
  })
})
