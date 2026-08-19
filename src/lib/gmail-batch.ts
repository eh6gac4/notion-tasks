// Gmail の batch エンドポイント(multipart/mixed)を組み立て・解析する純粋関数群。
// messages.list は ID しか返さないため 25 件分の messages.get が必要になるが、
// 1 件ずつ叩くと往復回数がそのままレイテンシになる。batch で 1 往復にまとめる。
//
// 仕様: https://developers.google.com/workspace/gmail/api/guides/batch

export const GMAIL_BATCH_URL = "https://gmail.googleapis.com/batch/gmail/v1"

// batch 内のサブリクエストは 100 件までだが、レスポンスサイズを抑えるため 50 で切る。
export const BATCH_MAX_SUBREQUESTS = 50

export interface BatchPartResult<T> {
  status: number
  body: T | null
}

/**
 * multipart/mixed のリクエストボディを組み立てる。
 * path は `/messages/xxx?format=metadata` のような users/me 以下の相対パス。
 */
export function buildBatchBody(paths: string[], boundary: string): string {
  const parts = paths.map(
    (path, i) =>
      `--${boundary}\r\n` +
      `Content-Type: application/http\r\n` +
      `Content-ID: <item-${i}>\r\n` +
      `\r\n` +
      `GET /gmail/v1/users/me${path}\r\n` +
      `\r\n`,
  )
  return `${parts.join("")}--${boundary}--\r\n`
}

/** レスポンスの Content-Type ヘッダから boundary を取り出す。 */
export function extractBoundary(contentType: string | null): string | null {
  if (!contentType) return null
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)
  if (!match) return null
  return match[1] ?? match[2] ?? null
}

// Content-ID: <response-item-3> から元のリクエスト位置を取り出す。
function parseContentIdIndex(headers: string): number | null {
  const match = headers.match(/^content-id:\s*<response-(?:item-)?(\d+)>/im)
  return match ? Number(match[1]) : null
}

function parseStatus(statusLine: string): number {
  const match = statusLine.match(/^HTTP\/[\d.]+\s+(\d{3})/)
  return match ? Number(match[1]) : 0
}

/**
 * multipart レスポンスを解析し、リクエストと同じ並び順の配列で返す。
 * Content-ID があればそれを優先し、無ければ出現順に詰める。
 * 解析できなかった位置は status 0 / body null になる。
 */
export function parseBatchResponse<T>(raw: string, boundary: string, expectedCount: number): BatchPartResult<T>[] {
  const results: BatchPartResult<T>[] = Array.from({ length: expectedCount }, () => ({ status: 0, body: null }))
  const segments = raw.split(`--${boundary}`)
  let fallbackIndex = 0

  for (const segment of segments) {
    const trimmed = segment.trim()
    if (!trimmed || trimmed === "--") continue

    // パートヘッダ → 内側の HTTP レスポンス、の順に空行で分割する。
    const headerEnd = segment.search(/\r?\n\r?\n/)
    if (headerEnd === -1) continue
    const partHeaders = segment.slice(0, headerEnd)
    const inner = segment.slice(headerEnd).replace(/^\r?\n\r?\n/, "")

    const innerHeaderEnd = inner.search(/\r?\n\r?\n/)
    const innerHead = innerHeaderEnd === -1 ? inner : inner.slice(0, innerHeaderEnd)
    const innerBody = innerHeaderEnd === -1 ? "" : inner.slice(innerHeaderEnd).replace(/^\r?\n\r?\n/, "")

    const index = parseContentIdIndex(partHeaders) ?? fallbackIndex
    fallbackIndex = index + 1
    if (index < 0 || index >= expectedCount) continue

    let body: T | null = null
    const text = innerBody.trim()
    if (text) {
      try {
        body = JSON.parse(text) as T
      } catch {
        body = null
      }
    }
    results[index] = { status: parseStatus(innerHead.trim()), body }
  }

  return results
}

/** サブリクエストを batch 上限ごとに分割する。 */
export function chunkSubRequests<T>(items: T[], size: number = BATCH_MAX_SUBREQUESTS): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
