// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "../route"

const { readAttachment } = vi.hoisted(() => ({ readAttachment: vi.fn() }))
vi.mock("@/lib/store", () => ({ getTaskStore: async () => ({ readAttachment }) }))
const pageId = "11111111-1111-4111-8111-111111111111"
const request = (id = pageId, index = "0") => GET(
  new NextRequest(`http://localhost/api/file/${id}/${index}`),
  { params: Promise.resolve({ pageId: id, index }) },
)
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })

describe("添付ファイルの配信", () => {
  it("R2の画像をインラインで返す", async () => {
    readAttachment.mockResolvedValue({ data: new TextEncoder().encode("image").buffer, contentType: "image/png", name: "image.png" })
    const res = await request()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-disposition")).toBe('inline; filename="image.png"')
    expect(await res.text()).toBe("image")
  })
  it("画像以外はダウンロードとして返す", async () => {
    readAttachment.mockResolvedValue({ data: new ArrayBuffer(0), contentType: "application/pdf", name: "file.pdf" })
    const res = await request()
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="file.pdf"')
  })
  it("存在しない添付は外部APIを呼ばず404にする", async () => {
    readAttachment.mockResolvedValue(null)
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect((await request()).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([["invalid", "0"], [pageId, "-1"], [pageId, "1.5"]])("不正な指定 %s/%s を拒否する", async (id, index) => {
    expect((await request(id, index)).status).toBe(400)
    expect(readAttachment).not.toHaveBeenCalled()
  })
})
