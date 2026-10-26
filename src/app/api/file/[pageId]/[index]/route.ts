import { type NextRequest } from "next/server"
import { getTaskStore } from "@/lib/store"
import type { AttachmentReadableStore } from "@/lib/store/types"

// pageId + index をキーにした安定 URL を提供し、
// Cloudflare Workers の caches.default でエッジキャッシュして配信する。

const CACHE_TTL_SEC = 2592000 // 30 日
const IMMUTABLE_CACHE = `public, max-age=${CACHE_TTL_SEC}, s-maxage=${CACHE_TTL_SEC}, immutable`
const NEGATIVE_CACHE = "public, max-age=300, s-maxage=300"

/** 画像コンテントタイプのプレフィクス */
const IMAGE_MIME_RE = /^image\//i

const PAGE_ID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

function getEdgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches
  return c?.default ?? null
}

async function resolveFromStore(
  pageId: string,
  index: number,
): Promise<{ data: ArrayBuffer; contentType: string; name: string } | null> {
  const store = (await getTaskStore()) as Partial<AttachmentReadableStore>
  if (typeof store.readAttachment !== "function") return null
  return store.readAttachment(pageId, index)
}

function buildResponse(bytes: ArrayBuffer, contentType: string, name: string): Response {
  const disposition = IMAGE_MIME_RE.test(contentType)
    ? `inline; filename="${encodeURIComponent(name)}"`
    : `attachment; filename="${encodeURIComponent(name)}"`
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": IMMUTABLE_CACHE,
      "content-disposition": disposition,
    },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string; index: string }> },
) {
  const { pageId, index: indexStr } = await params
  if (!PAGE_ID_RE.test(pageId)) return new Response(null, { status: 400 })
  const index = Number(indexStr)
  if (!Number.isInteger(index) || index < 0) return new Response(null, { status: 400 })

  const cache = getEdgeCache()
  const cacheKey = new Request(req.url, { method: "GET" })

  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }

  try {
    const stored = await resolveFromStore(pageId, index)
    if (stored) {
      const res = buildResponse(stored.data, stored.contentType, stored.name)
      if (cache) await cache.put(cacheKey, res.clone())
      return res
    }
  } catch (e) {
    console.error("[/api/file] store error:", e)
  }

  const res = new Response(null, { status: 404, headers: { "cache-control": NEGATIVE_CACHE } })
  if (cache) await cache.put(cacheKey, res.clone())
  return res
}
