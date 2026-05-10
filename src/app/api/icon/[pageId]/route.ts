import { type NextRequest } from "next/server"
import { Client } from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import { config } from "@/config"

// Notion の file icon は署名付き S3 URL で、リクエストごとに署名トークンが変わり
// ブラウザキャッシュが効かない。本ルートは pageId をキーにした安定 URL を提供し、
// Cloudflare Workers の caches.default で 30 日キャッシュしてエッジ配信する。

const IMMUTABLE_CACHE = "public, max-age=2592000, s-maxage=2592000, immutable"
const NEGATIVE_CACHE = "public, max-age=300, s-maxage=300"

const PAGE_ID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

function getEdgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches
  return c?.default ?? null
}

async function resolveIconUrl(pageId: string): Promise<string | null> {
  const notion = new Client({ auth: config.notion.token })
  const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
  const icon = page.icon
  if (!icon) return null
  if (icon.type === "file") return icon.file.url
  if (icon.type === "external") return icon.external.url
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params
  if (!PAGE_ID_RE.test(pageId)) return new Response(null, { status: 400 })

  const cache = getEdgeCache()
  const cacheKey = new Request(req.url, { method: "GET" })

  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }

  let iconUrl: string | null = null
  try {
    iconUrl = await resolveIconUrl(pageId)
  } catch (e) {
    console.error("[/api/icon] notion error:", e)
  }

  if (!iconUrl) {
    const res = new Response(null, { status: 404, headers: { "cache-control": NEGATIVE_CACHE } })
    if (cache) await cache.put(cacheKey, res.clone())
    return res
  }

  const upstream = await fetch(iconUrl)
  if (!upstream.ok) return new Response(null, { status: 502 })

  const contentType = upstream.headers.get("content-type") ?? "image/png"
  const bytes = await upstream.arrayBuffer()
  const res = new Response(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": IMMUTABLE_CACHE,
    },
  })
  if (cache) await cache.put(cacheKey, res.clone())
  return res
}
