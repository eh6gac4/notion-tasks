import { type NextRequest } from "next/server"
import { Client } from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import type { InternalOrExternalFileWithNameResponse } from "@notionhq/client/build/src/api-endpoints/common"
import { config } from "@/config"
import { NOTION_PROPS } from "@/constants/notion"

// Notion の files プロパティに含まれる内部ファイル (file type) は
// 署名付き S3 URL であり、リクエストごとに URL が変わりブラウザキャッシュが効かない。
// アイコンと同様に pageId + index をキーにした安定 URL を提供し、
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

async function resolveFileUrl(pageId: string, index: number): Promise<{ url: string; name: string } | null> {
  const notion = new Client({ auth: config.notion.token })
  const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
  const prop = page.properties[NOTION_PROPS.FILES] as {
    type: "files"
    files: InternalOrExternalFileWithNameResponse[]
  } | undefined
  const file = prop?.files?.[index]
  if (!file) return null
  if (file.type === "file") {
    return { url: (file as { type: "file"; file: { url: string } }).file.url, name: file.name }
  }
  if (file.type === "external") {
    return { url: (file as { type: "external"; external: { url: string } }).external.url, name: file.name }
  }
  return null
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

  let resolved: { url: string; name: string } | null = null
  try {
    resolved = await resolveFileUrl(pageId, index)
  } catch (e) {
    console.error("[/api/file] notion error:", e)
  }

  if (!resolved) {
    const res = new Response(null, { status: 404, headers: { "cache-control": NEGATIVE_CACHE } })
    if (cache) await cache.put(cacheKey, res.clone())
    return res
  }

  const upstream = await fetch(resolved.url)
  if (!upstream.ok) return new Response(null, { status: 502 })

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  const isImage = IMAGE_MIME_RE.test(contentType)
  const disposition = isImage
    ? `inline; filename="${encodeURIComponent(resolved.name)}"`
    : `attachment; filename="${encodeURIComponent(resolved.name)}"`

  const bytes = await upstream.arrayBuffer()
  const res = new Response(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": IMMUTABLE_CACHE,
      "content-disposition": disposition,
    },
  })
  if (cache) await cache.put(cacheKey, res.clone())
  return res
}
