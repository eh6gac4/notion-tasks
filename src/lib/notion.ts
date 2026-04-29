import { unstable_cache } from "next/cache"
import { Client } from "@notionhq/client"
import type { PageObjectResponse, BlockObjectResponse, PartialBlockObjectResponse, CommentObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import type { Task, TaskComment, TaskPriority, TaskStatus, CreateTaskInput, UpdateTaskInput } from "@/types/task"
import { NOTION_PROPS } from "@/constants/notion"
import { config } from "@/config"
import { getMockTasks, getMockTask, createMockTask, updateMockTask, getMockTaskBlocks, updateMockTaskBlocks, getMockTaskComments, addMockTaskComment, getMockTagOptions } from "@/lib/mock-tasks"

function isDevMode() {
  return process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development"
}

const notion = new Client({ auth: config.notion.token })

const DATABASE_ID = config.notion.databaseId
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

function pageToTask(page: PageObjectResponse): Task {
  const props = page.properties
  return {
    id: page.id,
    url: page.url,
    title:        extractTitle(props),
    status:       extractStatus(props),
    priority:     extractPriority(props),
    due:          extractDueDate(props),
    tags:         extractTags(props),
    assignees:    extractAssignees(props),
    source:       extractSource(props),
    sourceUrl:    extractSourceUrl(props),
    parentTaskIds: extractRelationIds(props[NOTION_PROPS.PARENT]),
    childTaskIds:  extractRelationIds(props[NOTION_PROPS.CHILD]),
    prevTaskIds:   extractRelationIds(props[NOTION_PROPS.PREV]),
    nextTaskIds:   extractRelationIds(props[NOTION_PROPS.NEXT]),
    createdTime:     page.created_time,
    lastEditedTime:  page.last_edited_time,
  }
}

async function fetchTasks(statuses: TaskStatus[]): Promise<Task[]> {
  try {
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
    })

    return response.results
      .filter((r): r is PageObjectResponse => r.object === "page" && "properties" in r)
      .map(pageToTask)
  } catch (e) {
    console.error("[getTasks] Notion error:", e)
    return []
  }
}

export function getTasks(options?: {
  statuses?: TaskStatus[]
  includeCompleted?: boolean
}): Promise<Task[]> {
  const statuses: TaskStatus[] = options?.statuses ?? ["未着手", "進行中"]
  if (isDevMode()) return Promise.resolve(getMockTasks(statuses))
  return unstable_cache(
    () => fetchTasks(statuses),
    ["tasks", statuses.join(",")],
    { tags: ["tasks"] }
  )()
}

export async function getTagOptions(): Promise<string[]> {
  if (isDevMode()) return getMockTagOptions()
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
  if (input.priority !== undefined) properties[NOTION_PROPS.PRIORITY]   = { select: { name: input.priority } }
  if (input.due !== undefined)      properties[NOTION_PROPS.DUE]        = input.due ? { date: { start: input.due } } : { date: null }
  if (input.tags !== undefined)     properties[NOTION_PROPS.TAG]        = { multi_select: input.tags.map((t) => ({ name: t })) }
  if (input.source !== undefined)   properties[NOTION_PROPS.SOURCE]     = { rich_text: [{ text: { content: input.source } }] }
  if (input.sourceUrl !== undefined) properties[NOTION_PROPS.SOURCE_URL] = { url: input.sourceUrl }

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

export async function updateTaskBlocks(id: string, markdown: string): Promise<void> {
  if (isDevMode()) {
    updateMockTaskBlocks(id, markdown)
    return
  }
  try {
    // Fetch existing blocks; delete only non-image blocks so user-attached
    // images survive a body edit (file-type Notion images use signed URLs
    // that can't be safely re-created).
    let cursor: string | undefined = undefined
    do {
      const response = await notion.blocks.children.list({
        block_id: id,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      })
      for (const block of response.results) {
        if (isFullBlockObjectResponse(block) && (block as { type: string }).type === "image") continue
        await notion.blocks.delete({ block_id: block.id })
      }
      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } while (cursor)

    // Strip image markdown lines: existing image blocks were preserved above,
    // so re-creating them would duplicate (and create dead links for
    // Notion-hosted file URLs that have since expired).
    const textOnly = markdown
      .split("\n")
      .filter((line) => !IMAGE_MARKDOWN_LINE.test(line))
      .join("\n")

    const newBlocks = markdownToNotionBlocks(textOnly)
    if (newBlocks.length > 0) {
      await notion.blocks.children.append({
        block_id: id,
        children: newBlocks as Parameters<typeof notion.blocks.children.append>[0]["children"],
      })
    }
  } catch (e) {
    console.error("[updateTaskBlocks] Notion error:", e)
    throw e
  }
}
