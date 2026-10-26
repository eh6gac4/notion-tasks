import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/require-auth", () => ({ isDevMode: () => false }))
vi.mock("@/lib/gmail", () => ({ getMailAttachment: vi.fn() }))
import { auth } from "@/auth"
import { getMailAttachment } from "@/lib/gmail"
import { GET } from "../route"

const request = new Request("https://example.com/api/mail/abc/attachments/0.1")
const context = { params: Promise.resolve({ messageId: "abc", attachmentId: "0.1" }) }

describe("メール添付の配信", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { name: "User" } } as never)
    vi.mocked(getMailAttachment).mockResolvedValue({ bytes: new Uint8Array([0, 255, 128]), filename: "資料.pdf", mimeType: "application/pdf" })
  })
  it("未認証では Gmail にアクセスしない", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await GET(request, context)).status).toBe(401)
    expect(getMailAttachment).not.toHaveBeenCalled()
  })
  it("PDF をキャッシュせず元のバイト列で開く", async () => {
    const response = await GET(request, context)
    expect(response.headers.get("Content-Disposition")).toContain("inline;")
    expect(response.headers.get("Content-Disposition")).toContain(encodeURIComponent("資料.pdf"))
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0, 255, 128]))
  })
  it.each(["text/html", "image/svg+xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])("%s はダウンロードにする", async (mimeType) => {
    vi.mocked(getMailAttachment).mockResolvedValue({ bytes: new Uint8Array(), filename: "file", mimeType })
    const response = await GET(request, context)
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/)
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })
  it("存在しない添付は404", async () => {
    vi.mocked(getMailAttachment).mockResolvedValue(null)
    expect((await GET(request, context)).status).toBe(404)
  })
  it("不正な階層指定は取得しない", async () => {
    expect((await GET(request, { params: Promise.resolve({ messageId: "abc", attachmentId: "../other" }) })).status).toBe(400)
    expect(getMailAttachment).not.toHaveBeenCalled()
  })
  it("取得失敗時に再試行案内を返す", async () => {
    vi.mocked(getMailAttachment).mockRejectedValue(new Error("API error"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await GET(request, context)).status).toBe(502)
    vi.restoreAllMocks()
  })
})
