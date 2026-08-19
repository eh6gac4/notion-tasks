import { describe, expect, it } from "vitest"
import {
  BATCH_MAX_SUBREQUESTS,
  buildBatchBody,
  chunkSubRequests,
  extractBoundary,
  parseBatchResponse,
} from "@/lib/gmail-batch"

describe("buildBatchBody", () => {
  it("各パスを Content-ID 付きのサブリクエストに変換する", () => {
    const body = buildBatchBody(["/messages/a", "/messages/b"], "B")

    expect(body).toContain("--B\r\nContent-Type: application/http\r\nContent-ID: <item-0>\r\n")
    expect(body).toContain("GET /gmail/v1/users/me/messages/a\r\n")
    expect(body).toContain("Content-ID: <item-1>")
    expect(body).toContain("GET /gmail/v1/users/me/messages/b\r\n")
  })

  it("終端の boundary で閉じる", () => {
    expect(buildBatchBody(["/messages/a"], "B")).toMatch(/--B--\r\n$/)
  })

  it("パスが空なら終端のみを返す", () => {
    expect(buildBatchBody([], "B")).toBe("--B--\r\n")
  })
})

describe("extractBoundary", () => {
  it("Content-Type から boundary を取り出す", () => {
    expect(extractBoundary("multipart/mixed; boundary=batch_abc123")).toBe("batch_abc123")
  })

  it("引用符付きの boundary にも対応する", () => {
    expect(extractBoundary('multipart/mixed; boundary="batch_abc 123"')).toBe("batch_abc 123")
  })

  it("boundary が無い場合や null の場合は null を返す", () => {
    expect(extractBoundary("multipart/mixed")).toBeNull()
    expect(extractBoundary(null)).toBeNull()
  })
})

// Gmail が返す multipart/mixed レスポンスを組み立てるヘルパ
function makePart(contentId: string, status: number, body: string): string {
  return (
    `--BND\r\n` +
    `Content-Type: application/http\r\n` +
    `Content-ID: <${contentId}>\r\n` +
    `\r\n` +
    `HTTP/1.1 ${status} OK\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n` +
    `\r\n` +
    `${body}\r\n`
  )
}

describe("parseBatchResponse", () => {
  it("各パートの JSON をリクエスト順の配列で返す", () => {
    const raw =
      makePart("response-item-0", 200, '{"id":"a"}') + makePart("response-item-1", 200, '{"id":"b"}') + "--BND--"

    const results = parseBatchResponse<{ id: string }>(raw, "BND", 2)

    expect(results).toEqual([
      { status: 200, body: { id: "a" } },
      { status: 200, body: { id: "b" } },
    ])
  })

  it("パートの順序が入れ替わっても Content-ID の位置に戻す", () => {
    const raw =
      makePart("response-item-1", 200, '{"id":"b"}') + makePart("response-item-0", 200, '{"id":"a"}') + "--BND--"

    const results = parseBatchResponse<{ id: string }>(raw, "BND", 2)

    expect(results[0].body).toEqual({ id: "a" })
    expect(results[1].body).toEqual({ id: "b" })
  })

  it("一部が失敗しても他の成功分は保持する", () => {
    const raw =
      makePart("response-item-0", 404, '{"error":{"code":404}}') +
      makePart("response-item-1", 200, '{"id":"b"}') +
      "--BND--"

    const results = parseBatchResponse<{ id?: string }>(raw, "BND", 2)

    expect(results[0].status).toBe(404)
    expect(results[1]).toEqual({ status: 200, body: { id: "b" } })
  })

  it("Content-ID が無い場合は出現順に詰める", () => {
    const raw =
      `--BND\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 OK\r\n\r\n{"id":"a"}\r\n` +
      `--BND\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 OK\r\n\r\n{"id":"b"}\r\n` +
      "--BND--"

    const results = parseBatchResponse<{ id: string }>(raw, "BND", 2)

    expect(results.map((r) => r.body)).toEqual([{ id: "a" }, { id: "b" }])
  })

  it("期待件数に満たないレスポンスは未取得の位置を空のまま返す", () => {
    const raw = makePart("response-item-0", 200, '{"id":"a"}') + "--BND--"

    const results = parseBatchResponse<{ id: string }>(raw, "BND", 3)

    expect(results).toHaveLength(3)
    expect(results[1]).toEqual({ status: 0, body: null })
    expect(results[2]).toEqual({ status: 0, body: null })
  })

  it("JSON として解釈できない本文は body を null にする", () => {
    const raw = makePart("response-item-0", 200, "not json") + "--BND--"

    expect(parseBatchResponse(raw, "BND", 1)[0]).toEqual({ status: 200, body: null })
  })

  it("範囲外の Content-ID は無視する", () => {
    const raw = makePart("response-item-9", 200, '{"id":"x"}') + "--BND--"

    expect(parseBatchResponse(raw, "BND", 1)).toEqual([{ status: 0, body: null }])
  })
})

describe("chunkSubRequests", () => {
  it("既定では batch の上限件数ごとに分割する", () => {
    const chunks = chunkSubRequests(Array.from({ length: BATCH_MAX_SUBREQUESTS + 1 }, (_, i) => i))

    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(BATCH_MAX_SUBREQUESTS)
    expect(chunks[1]).toHaveLength(1)
  })

  it("上限以下ならそのまま 1 チャンクにする", () => {
    expect(chunkSubRequests([1, 2, 3])).toEqual([[1, 2, 3]])
  })

  it("空配列ならチャンクを作らない", () => {
    expect(chunkSubRequests([])).toEqual([])
  })
})
