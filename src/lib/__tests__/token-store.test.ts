import { describe, expect, it, vi, beforeEach } from "vitest"

const first = vi.fn()
const run = vi.fn()
const bind = vi.fn<(...args: unknown[]) => { first: typeof first; run: typeof run }>(() => ({ first, run }))
const prepare = vi.fn<(sql: string) => { bind: typeof bind }>(() => ({ bind }))
let db: unknown = { prepare }

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { DB: db } }),
}))

const { getGoogleRefreshToken, setGoogleRefreshToken } = await import("@/lib/token-store")

describe("token-store", () => {
  beforeEach(() => {
    first.mockReset()
    run.mockReset()
    prepare.mockClear()
    bind.mockClear()
    db = { prepare }
  })

  it("D1 に行があればその値を返す", async () => {
    first.mockResolvedValue({ value: "d1-token" })
    await expect(getGoogleRefreshToken()).resolves.toBe("d1-token")
    expect(bind).toHaveBeenCalledWith("google_refresh_token")
  })

  it("D1 に行が無ければ env の GOOGLE_REFRESH_TOKEN にフォールバックする", async () => {
    first.mockResolvedValue(null)
    await expect(getGoogleRefreshToken()).resolves.toBe("test-google-refresh-token-placeholder")
  })

  it("D1 バインディングが無い場合も env にフォールバックして読み取りは落とさない", async () => {
    db = undefined
    await expect(getGoogleRefreshToken()).resolves.toBe("test-google-refresh-token-placeholder")
  })

  it("setGoogleRefreshToken は D1 に upsert する", async () => {
    await setGoogleRefreshToken("new-token")
    expect(prepare.mock.calls[0][0]).toContain("INSERT INTO app_tokens")
    expect(bind).toHaveBeenCalledWith("google_refresh_token", "new-token", expect.any(String))
    expect(run).toHaveBeenCalled()
  })

  it("D1 バインディングが無い場合の書き込みは黙って捨てずに落とす", async () => {
    db = undefined
    await expect(setGoogleRefreshToken("new-token")).rejects.toThrow(/D1 バインディング/)
  })
})
