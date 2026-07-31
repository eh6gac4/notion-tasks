import { Client } from "@notionhq/client"
import type { PageObjectResponse, BlockObjectResponse, PartialBlockObjectResponse, CommentObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import type { InternalOrExternalFileWithNameResponse } from "@notionhq/client/build/src/api-endpoints/common"
import type { Task, TaskAttachment, TaskComment, TaskIcon, TaskPriority, TaskStatus, CreateTaskInput, UpdateTaskInput } from "@/types/task"
import { NOTION_PROPS } from "@/constants/notion"
import { config } from "@/config"
import { getMockTasks, getMockTask, createMockTask, updateMockTask, getMockTaskBlocks, updateMockTaskBlocks, getMockTaskComments, addMockTaskComment, getMockTagOptions, addMockTaskAttachment, removeMockTaskAttachment } from "@/lib/mock-tasks"

function isDevMode() {
  return process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development"
}

const notion = new Client({ auth: config.notion.token })
// collection:// prefix stripped — dataSources.query needs UUID only
const DATA_SOURCE_ID = "7a3367e3-d695-4c23-8e7e-18ead8c56a33"

function extractRelationIds(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return []
  const p = prop as Record<string, unknown>
  if (p.type !== "relation" || !Array.isArray(p.relation)) return []
  return (p.relation as Array<{ id: string }>).map((r) => r.id)
}

function extractTitle(props: PageObjectResponse["properties"]): string {
  const p = props[NOTION_PROPS.TITLE] as { type: "title"; title: Array<{ plain_text: string }> }
  return p?.title?.map((t) => t.plain_text).join("") ?? ""
}

function extractStatus(props: PageObjectResponse["properties"]): TaskStatus | null {
  const p = props[NOTION_PROPS.STATUS] as { type: "status"; status: { name: string } | null }
  return (p?.status?.name ?? null) as TaskStatus | null
}

function extractPriority(props: PageObjectResponse["properties"]): TaskPriority | null {
  const p = props[NOTION_PROPS.PRIORITY] as { type: "select"; select: { name: string } | null }
  return (p?.select?.name ?? null) as TaskPriority | null
}

function extractDueDate(props: PageObjectResponse["properties"]): string | null {
  const p = props[NOTION_PROPS.DUE] as { type: "date"; date: { start: string } | null }
  return p?.date?.start ?? null
}

function extractTags(props: PageObjectResponse["properties"]): string[] {
  const p = props[NOTION_PROPS.TAG] as { type: "multi_select"; multi_select: Array<{ name: string }> }
  return p?.multi_select?.map((t) => t.name) ?? []
}

function extractLocation(props: PageObjectResponse["properties"]): string | null {
  const p = props[NOTION_PROPS.LOCATION] as { type: "select"; select: { name: string } | null } | undefined
  return p?.select?.name ?? null
}

function extractAssignees(props: PageObjectResponse["properties"]): string[] {
  const p = props[NOTION_PROPS.ASSIGNEE] as { type: "people"; people: Array<{ id: string }> }
  return p?.people?.map((p) => p.id) ?? []
}

function extractSource(props: PageObjectResponse["properties"]): string | null {
  const p = props[NOTION_PROPS.SOURCE] as { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  return p?.rich_text?.map((t) => t.plain_text).join("") || null
}

function extractSourceUrl(props: PageObjectResponse["properties"]): string | null {
  const p = props[NOTION_PROPS.SOURCE_URL] as { type: "url"; url: string | null }
  return p?.url ?? null
}

function extractIcon(
  icon: PageObjectResponse["icon"],
  pageId: string,
  lastEditedTime: string,
): TaskIcon | null {
  if (!icon) return null
  if (icon.type === "emoji") return { type: "emoji", emoji: icon.emoji }
  // file (Notion S3 署名 URL) はリクエストごとに署名が変わりブラウザキャッシュが
  // 効かないため、pageId をキーにした安定 proxy URL に置き換える。
  // v に last_edited_time を載せることで、ページ更新時にキャッシュが自然に切れる。
  if (icon.type === "file") {
    return { type: "url", url: `/api/icon/${pageId}?v=${encodeURIComponent(lastEditedTime)}` }
  }
  // external は Notion 提供 CDN や任意 URL。すでにブラウザキャッシュが効くのでそのまま。
  if (icon.type === "external") return { type: "url", url: icon.external.url }
  return null
}

/** 画像ファイルとみなす拡張子 */
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i

/**
 * files プロパティから安定 proxy URL ベースの TaskAttachment[] を生成する。
 * アイコンと同様に、Notion の署名付き S3 URL をキャッシュに乗せないよう
 * /api/file/[pageId]/[index] 経由に変換する。
 */
function extractAttachments(
  props: PageObjectResponse["properties"],
  pageId: string,
  lastEditedTime: string,
): TaskAttachment[] {
  const p = props[NOTION_PROPS.FILES] as {
    type: "files"
    files: InternalOrExternalFileWithNameResponse[]
  } | undefined
  if (!p?.files?.length) return []
  return p.files.map((f, index) => ({
    name: f.name,
    url: `/api/file/${pageId}/${index}?v=${encodeURIComponent(lastEditedTime)}`,
    isImage: IMAGE_EXT_RE.test(f.name),
  }))
}

function pageToTask(page: PageObjectResponse): Task {
  const props = page.properties
  return {
    id: page.id,
    url: page.url,
    title:        extractTitle(props),
    icon:         extractIcon(page.icon, page.id, page.last_edited_time),
    status:       extractStatus(props),
    priority:     extractPriority(props),
    due:          extractDueDate(props),
    tags:         extractTags(props),
    location:     extractLocation(props),
    assignees:    extractAssignees(props),
    source:       extractSource(props),
    sourceUrl:    extractSourceUrl(props),
    parentTaskIds: extractRelationIds(props[NOTION_PROPS.PARENT]),
    childTaskIds:  extractRelationIds(props[NOTION_PROPS.CHILD]),
    prevTaskIds:   extractRelationIds(props[NOTION_PROPS.PREV]),
    nextTaskIds:   extractRelationIds(props[NOTION_PROPS.NEXT]),
    createdTime:     page.created_time,
    lastEditedTime:  page.last_edited_time,
    attachments:     extractAttachments(props, page.id, page.last_edited_time),
  }
}

async function fetchTasks(statuses: TaskStatus[]): Promise<Task[]> {
  // ボード化で全ステータスを 1 クエリで取るようになったため、page_size 100
  // (Notion API デフォルト) では完了/中止が大量にあると未着手・進行中が
  // 切り落とされる。has_more が消えるまでカーソル送りして全件取得する。
  try {
    const all: PageObjectResponse[] = []
    let cursor: string | undefined = undefined

    do {
      const response = await notion.dataSources.query({
        data_source_id: DATA_SOURCE_ID,
        filter: {
          or: statuses.map((s) => ({
            property: NOTION_PROPS.STATUS,
            status: { equals: s },
          })),
        },
        sorts: [
          { property: NOTION_PROPS.PRIORITY, direction: "ascending" },
          { property: NOTION_PROPS.DUE,      direction: "ascending" },
        ],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })

      for (const r of response.results) {
        if (r.object === "page" && "properties" in r) all.push(r as PageObjectResponse)
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (cursor)

    return all.map(pageToTask)
  } catch (e) {
    console.error("[getTasks] Notion error:", e)
    return []
  }
}

// 初回レンダで取得するステータス。完了/中止は件数が多くなりがちなので、
// 該当カラムが画面に出たときに別途 fetch するようにし、初回コストを下げる。
const INITIAL_STATUSES: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断"]

// Cloudflare Workers (open-next) では tagCache 未設定時に updateTag が no-op に
// なり、unstable_cache の値が永久に古くなる。個人用アプリで Notion API 呼び
// 出しを毎回行ってもコストは小さいため、キャッシュを使わず常に直接 fetch する。
export function getTasks(options?: {
  statuses?: TaskStatus[]
}): Promise<Task[]> {
  const statuses: TaskStatus[] = options?.statuses ?? INITIAL_STATUSES
  if (isDevMode()) return Promise.resolve(getMockTasks(statuses))
  return fetchTasks(statuses)
}

async function fetchTagOptions(): Promise<string[]> {
  try {
    const ds = await notion.dataSources.retrieve({ data_source_id: DATA_SOURCE_ID })
    const tagProp = (ds as { properties: Record<string, unknown> }).properties?.[NOTION_PROPS.TAG] as
      | { type: "multi_select"; multi_select: { options: Array<{ name: string }> } }
      | undefined
    return tagProp?.multi_select?.options?.map((o) => o.name) ?? []
  } catch (e) {
    console.error("[getTagOptions] Notion error:", e)
    return []
  }
}

export function getTagOptions(): Promise<string[]> {
  if (isDevMode()) return Promise.resolve(getMockTagOptions())
  return fetchTagOptions()
}

async function fetchLocationOptions(): Promise<string[]> {
  try {
    const ds = await notion.dataSources.retrieve({ data_source_id: DATA_SOURCE_ID })
    const locProp = (ds as { properties: Record<string, unknown> }).properties?.[NOTION_PROPS.LOCATION] as
      | { type: "select"; select: { options: Array<{ name: string }> } }
      | undefined
    return locProp?.select?.options?.map((o) => o.name) ?? []
  } catch (e) {
    console.error("[getLocationOptions] Notion error:", e)
    return []
  }
}

export function getLocationOptions(): Promise<string[]> {
  if (isDevMode()) return Promise.resolve(["自宅", "オフィス", "スーパー"]) // Mock
  return fetchLocationOptions()
}

export async function getTask(id: string): Promise<Task | null> {
  if (isDevMode()) return getMockTask(id) ?? null
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    if (page.object !== "page" || !("properties" in page)) return null
    return pageToTask(page as PageObjectResponse)
  } catch {
    return null
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  if (isDevMode()) return createMockTask(input)
  const properties: Record<string, unknown> = {
    [NOTION_PROPS.TITLE]: { title: [{ text: { content: input.title } }] },
  }

  if (input.status)      properties[NOTION_PROPS.STATUS]     = { status: { name: input.status } }
  if (input.priority)    properties[NOTION_PROPS.PRIORITY]   = { select: { name: input.priority } }
  if (input.due)         properties[NOTION_PROPS.DUE]        = { date: { start: input.due } }
  if (input.tags?.length) properties[NOTION_PROPS.TAG]       = { multi_select: input.tags.map((t) => ({ name: t })) }
  if (input.location)    properties[NOTION_PROPS.LOCATION]   = { select: { name: input.location } }
  if (input.source)      properties[NOTION_PROPS.SOURCE]     = { rich_text: [{ text: { content: input.source } }] }
  if (input.sourceUrl)   properties[NOTION_PROPS.SOURCE_URL] = { url: input.sourceUrl }
  if (input.parentTaskId) properties[NOTION_PROPS.PARENT]   = { relation: [{ id: input.parentTaskId }] }

  const page = await notion.pages.create({
    parent: { data_source_id: DATA_SOURCE_ID, type: "data_source_id" },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  })

  if (input.body?.trim()) {
    const blocks = markdownToNotionBlocks(input.body)
    if (blocks.length > 0) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: blocks as Parameters<typeof notion.blocks.children.append>[0]["children"],
      })
    }
  }

  return pageToTask(page as PageObjectResponse)
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  if (isDevMode()) {
    const task = updateMockTask(id, input)
    if (!task) throw new Error(`Mock task ${id} not found`)
    return task
  }
  const properties: Record<string, unknown> = {}

  if (input.title !== undefined)    properties[NOTION_PROPS.TITLE]      = { title: [{ text: { content: input.title } }] }
  if (input.status !== undefined)   properties[NOTION_PROPS.STATUS]     = { status: { name: input.status } }
  if (input.priority !== undefined) properties[NOTION_PROPS.PRIORITY]   = input.priority ? { select: { name: input.priority } } : { select: null }
  if (input.due !== undefined)      properties[NOTION_PROPS.DUE]        = input.due ? { date: { start: input.due } } : { date: null }
  if (input.tags !== undefined)     properties[NOTION_PROPS.TAG]        = { multi_select: input.tags.map((t) => ({ name: t })) }
  if (input.location !== undefined) properties[NOTION_PROPS.LOCATION]   = input.location ? { select: { name: input.location } } : { select: null }
  if (input.source !== undefined)   properties[NOTION_PROPS.SOURCE]     = { rich_text: [{ text: { content: input.source } }] }
  if (input.sourceUrl !== undefined) properties[NOTION_PROPS.SOURCE_URL] = { url: input.sourceUrl }
  if (input.parentTaskIds !== undefined) {
    properties[NOTION_PROPS.PARENT] = { relation: input.parentTaskIds.map((id) => ({ id })) }
  }
  if (input.prevTaskIds !== undefined) {
    properties[NOTION_PROPS.PREV] = { relation: input.prevTaskIds.map((id) => ({ id })) }
  }
  if (input.nextTaskIds !== undefined) {
    properties[NOTION_PROPS.NEXT] = { relation: input.nextTaskIds.map((id) => ({ id })) }
  }

  const page = await notion.pages.update({
    page_id: id,
    properties: properties as Parameters<typeof notion.pages.update>[0]["properties"],
  })

  return pageToTask(page as PageObjectResponse)
}

// --- Block content helpers ---

function extractPlainText(richText: Array<{ plain_text: string }>): string {
  return richText.map((r) => r.plain_text).join("")
}

function isFullBlockObjectResponse(
  block: BlockObjectResponse | PartialBlockObjectResponse
): block is BlockObjectResponse {
  return "type" in block
}

function blocksToMarkdown(blocks: BlockObjectResponse[]): string {
  const lines: string[] = []

  for (const block of blocks) {
    const b = block as Record<string, unknown>
    const type = b.type as string

    if (type === "heading_1") {
      const rt = (b["heading_1"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`# ${extractPlainText(rt)}`)
    } else if (type === "heading_2") {
      const rt = (b["heading_2"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`## ${extractPlainText(rt)}`)
    } else if (type === "heading_3") {
      const rt = (b["heading_3"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`### ${extractPlainText(rt)}`)
    } else if (type === "bulleted_list_item") {
      const rt = (b["bulleted_list_item"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`- ${extractPlainText(rt)}`)
    } else if (type === "numbered_list_item") {
      const rt = (b["numbered_list_item"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`1. ${extractPlainText(rt)}`)
    } else if (type === "to_do") {
      const td = b["to_do"] as { rich_text: Array<{ plain_text: string }>; checked: boolean }
      const check = td.checked ? "[x]" : "[ ]"
      lines.push(`- ${check} ${extractPlainText(td.rich_text)}`)
    } else if (type === "quote") {
      const rt = (b["quote"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(`> ${extractPlainText(rt)}`)
    } else if (type === "code") {
      const cd = b["code"] as { rich_text: Array<{ plain_text: string }>; language?: string }
      lines.push("```")
      lines.push(extractPlainText(cd.rich_text))
      lines.push("```")
    } else if (type === "divider") {
      lines.push("---")
    } else if (type === "image") {
      const img = b["image"] as {
        type: "external" | "file"
        external?: { url: string }
        file?: { url: string }
        caption?: Array<{ plain_text: string }>
      }
      const url = img.type === "external" ? img.external?.url : img.file?.url
      if (url) {
        const caption = img.caption ? extractPlainText(img.caption) : ""
        lines.push(`![${caption}](${url})`)
      }
    } else if (type === "paragraph") {
      const rt = (b["paragraph"] as { rich_text: Array<{ plain_text: string }> }).rich_text
      lines.push(extractPlainText(rt))
    } else {
      // fallback: try to extract any rich_text
      const inner = b[type] as { rich_text?: Array<{ plain_text: string }> } | undefined
      if (inner?.rich_text) lines.push(extractPlainText(inner.rich_text))
    }
  }

  return lines.join("\n")
}

function markdownToNotionBlocks(markdown: string): object[] {
  const blocks: object[] = []
  const lines = markdown.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: codeLines.join("\n") } }],
          language: "plain text",
        },
      })
      i++ // skip closing ```
      continue
    }

    if (line === "---") {
      blocks.push({ type: "divider", divider: {} })
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } })
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } })
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] } })
    } else if (/^- \[x\] /i.test(line)) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: line.slice(6) } }], checked: true } })
    } else if (/^- \[ \] /.test(line)) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: line.slice(6) } }], checked: false } })
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } })
    } else if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\. /, "")
      blocks.push({ type: "numbered_list_item", numbered_list_item: { rich_text: [{ type: "text", text: { content } }] } })
    } else if (line.startsWith("> ")) {
      blocks.push({ type: "quote", quote: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } })
    } else {
      blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } })
    }

    i++
  }

  return blocks
}

export async function getTaskBlocks(id: string): Promise<string> {
  if (isDevMode()) return getMockTaskBlocks(id)
  try {
    const allBlocks: BlockObjectResponse[] = []
    let cursor: string | undefined = undefined

    do {
      const response = await notion.blocks.children.list({
        block_id: id,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })
      allBlocks.push(...response.results.filter(isFullBlockObjectResponse))
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (cursor)

    return blocksToMarkdown(allBlocks)
  } catch (e) {
    console.error("[getTaskBlocks] Notion error:", e)
    return ""
  }
}

export async function getTaskComments(id: string): Promise<TaskComment[]> {
  if (isDevMode()) return getMockTaskComments(id)
  try {
    const allComments: CommentObjectResponse[] = []
    let cursor: string | undefined = undefined

    do {
      const response = await notion.comments.list({
        block_id: id,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })
      allComments.push(...response.results)
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (cursor)

    return allComments.map((c) => ({
      id: c.id,
      text: c.rich_text.map((r) => r.plain_text).join(""),
      author: c.display_name.resolved_name ?? "Unknown",
      createdTime: c.created_time,
    }))
  } catch (e) {
    console.error("[getTaskComments] Notion error:", e)
    return []
  }
}

export async function createTaskComment(id: string, text: string, author = "Unknown"): Promise<TaskComment> {
  if (isDevMode()) return addMockTaskComment(id, text)
  try {
    const response = await notion.comments.create({
      parent: { page_id: id },
      rich_text: [{ type: "text", text: { content: text } }],
    })
    const c = response as CommentObjectResponse
    return {
      id: c.id,
      text: c.rich_text.map((r) => r.plain_text).join(""),
      author,
      createdTime: c.created_time,
    }
  } catch (e) {
    console.error("[createTaskComment] Notion error:", e)
    throw e
  }
}

const IMAGE_MARKDOWN_LINE = /^!\[[^\]]*\]\(.+\)$/

// 旧ブロック (API レスポンス, rich_text[].plain_text) と新ブロック (作成ペイロード,
// rich_text[].text.content) で同じキーを生成するため、それぞれ専用のヘルパを使う。
function oldBlockDiffKey(block: BlockObjectResponse): string {
  const b = block as Record<string, unknown>
  const type = b.type as string
  if (type === "divider") return "divider"
  if (type === "code") {
    const cd = b.code as { rich_text: Array<{ plain_text: string }>; language?: string }
    return `code|${cd.language ?? ""}|${extractPlainText(cd.rich_text)}`
  }
  if (type === "to_do") {
    const td = b.to_do as { rich_text: Array<{ plain_text: string }>; checked: boolean }
    return `to_do|${td.checked ? 1 : 0}|${extractPlainText(td.rich_text)}`
  }
  const data = b[type] as { rich_text?: Array<{ plain_text: string }> } | undefined
  const text = data?.rich_text ? extractPlainText(data.rich_text) : ""
  return `${type}|${text}`
}

function newBlockDiffKey(block: object): string {
  const b = block as Record<string, unknown>
  const type = b.type as string
  if (type === "divider") return "divider"
  const newRichText = (rt: Array<{ text: { content: string } }>) =>
    rt.map((r) => r.text.content).join("")
  if (type === "code") {
    const cd = b.code as { rich_text: Array<{ text: { content: string } }>; language?: string }
    return `code|${cd.language ?? ""}|${newRichText(cd.rich_text)}`
  }
  if (type === "to_do") {
    const td = b.to_do as { rich_text: Array<{ text: { content: string } }>; checked: boolean }
    return `to_do|${td.checked ? 1 : 0}|${newRichText(td.rich_text)}`
  }
  const data = b[type] as { rich_text?: Array<{ text: { content: string } }> } | undefined
  const text = data?.rich_text ? newRichText(data.rich_text) : ""
  return `${type}|${text}`
}

type DiffOp =
  | { kind: "keep"; oldIdx: number; newIdx: number }
  | { kind: "update"; oldIdx: number; newIdx: number }
  | { kind: "delete"; oldIdx: number }
  | { kind: "insert"; newIdx: number }

function lcsDiff(oldKeys: string[], newKeys: string[]): DiffOp[] {
  const m = oldKeys.length
  const n = newKeys.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldKeys[i - 1] === newKeys[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const ops: DiffOp[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldKeys[i - 1] === newKeys[j - 1]) {
      ops.push({ kind: "keep", oldIdx: i - 1, newIdx: j - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ kind: "insert", newIdx: j - 1 })
      j--
    } else {
      ops.push({ kind: "delete", oldIdx: i - 1 })
      i--
    }
  }
  return ops.reverse()
}

// 同じ region (= keep に挟まれた delete/insert の連続) 内で、
// 順序が同じ位置にある delete[k] / insert[k] を、type が一致するときに
// blocks.update へ置き換える。ブロック ID と紐づくコメント/メンションを保つ
// ためで、API コール数も 1 (delete) + 1 (insert) → 1 (update) に減る。
// 順序ペアリング (d[k] ↔ i[k]) を厳守することで、ブロック並びの取り違えを防ぐ。
function pairUpdatesInPlace(
  ops: DiffOp[],
  oldTextBlocks: BlockObjectResponse[],
  newBlocks: object[]
): DiffOp[] {
  const result: DiffOp[] = []
  let i = 0
  while (i < ops.length) {
    if (ops[i].kind === "keep") {
      result.push(ops[i])
      i++
      continue
    }
    const regionStart = i
    while (i < ops.length && ops[i].kind !== "keep") i++
    const region = ops.slice(regionStart, i)

    const deletes: { regionIdx: number; oldIdx: number }[] = []
    const inserts: { regionIdx: number; newIdx: number }[] = []
    region.forEach((o, idx) => {
      if (o.kind === "delete") deletes.push({ regionIdx: idx, oldIdx: o.oldIdx })
      else if (o.kind === "insert") inserts.push({ regionIdx: idx, newIdx: o.newIdx })
    })

    const pairedDelete = new Set<number>()
    const pairedInsert = new Set<number>()
    const updates = new Map<number, { oldIdx: number; newIdx: number }>()
    const minLen = Math.min(deletes.length, inserts.length)
    for (let k = 0; k < minLen; k++) {
      const oldType = (oldTextBlocks[deletes[k].oldIdx] as { type: string }).type
      const newType = (newBlocks[inserts[k].newIdx] as { type: string }).type
      if (oldType === newType) {
        pairedDelete.add(deletes[k].regionIdx)
        pairedInsert.add(inserts[k].regionIdx)
        updates.set(deletes[k].regionIdx, {
          oldIdx: deletes[k].oldIdx,
          newIdx: inserts[k].newIdx,
        })
      }
    }

    region.forEach((o, idx) => {
      if (pairedInsert.has(idx)) return
      if (pairedDelete.has(idx)) {
        const u = updates.get(idx)!
        result.push({ kind: "update", oldIdx: u.oldIdx, newIdx: u.newIdx })
      } else {
        result.push(o)
      }
    })
  }
  return result
}

export async function updateTaskBlocks(id: string, markdown: string): Promise<void> {
  if (isDevMode()) {
    updateMockTaskBlocks(id, markdown)
    return
  }
  try {
    // 1. 既存ブロックを取得
    const oldBlocks: BlockObjectResponse[] = []
    let cursor: string | undefined = undefined
    do {
      const response = await notion.blocks.children.list({
        block_id: id,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })
      for (const block of response.results) {
        if (isFullBlockObjectResponse(block)) oldBlocks.push(block)
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (cursor)

    // 2. 画像はそのまま保持。それ以外を diff 対象とする。
    //    file-type の画像は署名付き URL なので作り直せない。
    const oldTextBlocks = oldBlocks.filter((b) => (b as { type: string }).type !== "image")

    // 3. 入力 markdown から画像行を除外（既存画像との二重防止）
    const textOnly = markdown
      .split("\n")
      .filter((line) => !IMAGE_MARKDOWN_LINE.test(line))
      .join("\n")
    const newBlocks = markdownToNotionBlocks(textOnly)

    // 4. ブロック単位の安定キーで LCS 差分。同じ内容のブロックは何もしない。
    const oldKeys = oldTextBlocks.map(oldBlockDiffKey)
    const newKeys = newBlocks.map(newBlockDiffKey)
    const rawOps = lcsDiff(oldKeys, newKeys)

    // 4-2. 同位置・同 type の delete+insert を blocks.update に置換
    let ops = pairUpdatesInPlace(rawOps, oldTextBlocks, newBlocks)

    // 4-3. 「先頭への insert」は anchor が無いと append が末尾に行ってしまい、
    //      新しい行が body の最後に追記されてしまうため、対策する:
    //      - 先頭テキストブロックより前の最後の image を anchor 候補として使う
    //      - その image も無いなら、後続の keep/update を全て delete に降格させる
    //        (= 旧来の delete-all + append-all に局所的にフォールバック)。
    //        update へのペアリング最適化は再適用するので、典型ケースの API
    //        コール数は大きく増えない。
    const firstTextId = oldTextBlocks[0]?.id
    let leadingImageAnchor: string | null = null
    if (firstTextId) {
      for (const b of oldBlocks) {
        if (b.id === firstTextId) break
        if ((b as { type: string }).type === "image") leadingImageAnchor = b.id
      }
    }
    const firstAnchorIdx = ops.findIndex((o) => o.kind === "keep" || o.kind === "update")
    const hasHeadInsert = firstAnchorIdx > 0 &&
      ops.slice(0, firstAnchorIdx).some((o) => o.kind === "insert")
    if (hasHeadInsert && leadingImageAnchor === null) {
      const fallback: DiffOp[] = [
        ...oldTextBlocks.map((_, i) => ({ kind: "delete" as const, oldIdx: i })),
        ...newBlocks.map((_, i) => ({ kind: "insert" as const, newIdx: i })),
      ]
      ops = pairUpdatesInPlace(fallback, oldTextBlocks, newBlocks)
    }

    // 5. delete 対象を集める
    const idsToDelete: string[] = []
    for (const op of ops) {
      if (op.kind === "delete") idsToDelete.push(oldTextBlocks[op.oldIdx].id)
    }

    // 6. insert は連続するものを1コールにまとめ、直前の keep/update ブロック ID を after に指定。
    //    update は元のブロック ID を保つので、anchor として keep と同等に扱える。
    //    delete を挟んでも anchor は変わらない (削除されたブロックは anchor に
    //    使えないし、間に keep/update が無いなら新しい group を作る必要も無い:
    //    複数 group が同一 anchor を共有すると並列実行で順序が逆転するため
    //    1 group にまとめておく)。
    //    冒頭の anchor は leadingImageAnchor (= 先頭画像) で初期化する。
    type InsertGroup = { after: string | null; payloads: object[] }
    const insertGroups: InsertGroup[] = []
    let currentGroup: InsertGroup | null = null
    let lastAnchorId: string | null = leadingImageAnchor
    for (const op of ops) {
      if (op.kind === "keep" || op.kind === "update") {
        lastAnchorId = oldTextBlocks[op.oldIdx].id
        currentGroup = null
      } else if (op.kind === "insert") {
        if (currentGroup === null) {
          currentGroup = { after: lastAnchorId, payloads: [] }
          insertGroups.push(currentGroup)
        }
        currentGroup.payloads.push(newBlocks[op.newIdx])
      }
      // delete: anchor / group は変えない
    }

    // 7. delete / update / insert は別ブロックを触るので並走可。並列度 10 で実行。
    type Task = () => Promise<unknown>
    const tasks: Task[] = []
    for (const bid of idsToDelete) {
      tasks.push(() => notion.blocks.delete({ block_id: bid }))
    }
    for (const op of ops) {
      if (op.kind !== "update") continue
      const oldBlock = oldTextBlocks[op.oldIdx]
      const newBlock = newBlocks[op.newIdx] as Record<string, unknown>
      const type = newBlock.type as string
      const data = newBlock[type]
      tasks.push(() => notion.blocks.update({
        block_id: oldBlock.id,
        [type]: data,
      } as Parameters<typeof notion.blocks.update>[0]))
    }
    for (const g of insertGroups) {
      tasks.push(() => notion.blocks.children.append({
        block_id: id,
        children: g.payloads as Parameters<typeof notion.blocks.children.append>[0]["children"],
        ...(g.after ? { after: g.after } : {}),
      }))
    }

    const CONCURRENCY = 10
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      const batch = tasks.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map((t) => t()))
    }
  } catch (e) {
    console.error("[updateTaskBlocks] Notion error:", e)
    throw e
  }
}

// --- 添付ファイル ---

/** single_part アップロードの上限 (20 MB) */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/**
 * 現在ページの files プロパティを取得し、
 * InternalOrExternalFileWithNameRequest 形式に変換して返す。
 * pages.update 時に既存ファイルを保持するために使う。
 */
async function fetchExistingFilesForUpdate(
  pageId: string,
): Promise<Array<{ type: "file"; name: string; file: { url: string } } | { type: "external"; name: string; external: { url: string } }>> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
  const prop = page.properties[NOTION_PROPS.FILES] as {
    type: "files"
    files: InternalOrExternalFileWithNameResponse[]
  } | undefined
  if (!prop?.files?.length) return []
  return prop.files.map((f) => {
    if (f.type === "file") {
      return { type: "file" as const, name: f.name, file: { url: (f as { type: "file"; file: { url: string } }).file.url } }
    } else {
      return { type: "external" as const, name: f.name, external: { url: (f as { type: "external"; external: { url: string } }).external.url } }
    }
  })
}

/**
 * ファイルを Notion File Upload API でアップロードし、
 * タスクの添付ファイルプロパティに追加する。
 * 更新後の TaskAttachment[] を返す。
 */
export async function uploadTaskAttachment(pageId: string, file: File): Promise<TaskAttachment[]> {
  if (isDevMode()) return addMockTaskAttachment(pageId, file)

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`ファイルサイズが上限 (20 MB) を超えています: ${file.name}`)
  }

  // 1. File Upload を作成
  let upload: Awaited<ReturnType<typeof notion.fileUploads.create>>
  try {
    upload = await notion.fileUploads.create({
      mode: "single_part",
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    })
  } catch (e) {
    console.error("[uploadTaskAttachment] fileUploads.create failed:", e)
    throw e
  }

  // 2. ファイルデータを送信
  // Workers ランタイムでは受信 multipart 由来の File がストリーム読み取り済みになり得るため、
  // arrayBuffer() で実体化した後に新しい Blob として渡す。
  try {
    const buf = await file.arrayBuffer()
    const blob = new Blob([buf], { type: file.type || "application/octet-stream" })
    await notion.fileUploads.send({
      file_upload_id: upload.id,
      file: { filename: file.name, data: blob },
    })
  } catch (e) {
    console.error("[uploadTaskAttachment] fileUploads.send failed:", e)
    throw e
  }

  // 3. 既存ファイルを取得して配列末尾に新しい file_upload を追加
  let existing: Awaited<ReturnType<typeof fetchExistingFilesForUpdate>>
  try {
    existing = await fetchExistingFilesForUpdate(pageId)
  } catch (e) {
    console.error("[uploadTaskAttachment] fetchExistingFilesForUpdate failed:", e)
    throw e
  }
  const updated = [
    ...existing,
    { type: "file_upload" as const, file_upload: { id: upload.id }, name: file.name },
  ]

  // 4. ページを更新
  let page: Awaited<ReturnType<typeof notion.pages.update>>
  try {
    page = await notion.pages.update({
      page_id: pageId,
      properties: {
        [NOTION_PROPS.FILES]: { files: updated },
      } as Parameters<typeof notion.pages.update>[0]["properties"],
    })
  } catch (e) {
    console.error("[uploadTaskAttachment] pages.update failed:", e)
    throw e
  }

  return extractAttachments(
    (page as PageObjectResponse).properties,
    pageId,
    (page as PageObjectResponse).last_edited_time,
  )
}

/**
 * 指定インデックスの添付ファイルを削除する。
 * 残りのファイル配列を保持したまま pages.update する。
 * 更新後の TaskAttachment[] を返す。
 */
export async function removeTaskAttachment(pageId: string, index: number): Promise<TaskAttachment[]> {
  if (isDevMode()) return removeMockTaskAttachment(pageId, index)

  const existing = await fetchExistingFilesForUpdate(pageId)
  const updated = existing.filter((_, i) => i !== index)

  const page = await notion.pages.update({
    page_id: pageId,
    properties: {
      [NOTION_PROPS.FILES]: { files: updated },
    } as Parameters<typeof notion.pages.update>[0]["properties"],
  })

  return extractAttachments(
    (page as PageObjectResponse).properties,
    pageId,
    (page as PageObjectResponse).last_edited_time,
  )
}
