import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/require-auth", () => ({ isDevMode: () => false }))
vi.mock("@/lib/token-store", () => ({ getGoogleRefreshToken: vi.fn().mockResolvedValue("refresh-token") }))
import { clearAccessTokenCache, getMailAttachment } from "@/lib/gmail"

const bytes = new Uint8Array([0, 255, 128, 254, 1])
const encoded = Buffer.from(bytes).toString("base64url")

describe("Gmail 添付の取得", () => {
  beforeEach(() => { clearAccessTokenCache() })
  afterEach(() => { vi.unstubAllGlobals() })
  it.each([true, false])("外部取得=%s の添付をバイナリのまま復元する", async (external) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "token", expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ payload: { mimeType: "multipart/mixed", parts: [
        { mimeType: "application/pdf", filename: "資料.pdf", body: external ? { attachmentId: "remote-id", size: 5 } : { data: encoded, size: 5 } },
      ] } }))
    if (external) fetchMock.mockResolvedValueOnce(Response.json({ data: encoded }))
    vi.stubGlobal("fetch", fetchMock)
    const attachment = await getMailAttachment("abc", "0.0")
    expect(attachment?.bytes).toEqual(bytes)
    expect(attachment?.filename).toBe("資料.pdf")
    expect(fetchMock).toHaveBeenCalledTimes(external ? 3 : 2)
    if (external) expect(fetchMock.mock.calls[2][0]).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/abc/attachments/remote-id")
  })
  it("存在しない添付は取得しない", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "token", expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json({ payload: { mimeType: "text/plain", body: { data: encoded } } }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await getMailAttachment("abc", "0")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
