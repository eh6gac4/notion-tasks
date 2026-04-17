import { Client } from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import type { Task, TaskPriority, TaskStatus, TaskTag, CreateTaskInput, UpdateTaskInput } from "@/types/task"

const notion = new Client({ auth: process.env.NOTION_TOKEN })

const DATABASE_ID = process.env.NOTION_DATABASE_ID!
// collection:// prefix stripped — dataSources.query needs UUID only
const DATA_SOURCE_ID = "7a3367e3-d695-4c23-8e7e-18ead8c56a33"

function extractRelationIds(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return []
  const p = prop as Record<string, unknown>
  if (p.type !== "relation" || !Array.isArray(p.relation)) return []
  return (p.relation as Array<{ id: string }>).map((r) => r.id)
}

function pageToTask(page: PageObjectResponse): Task {
  const props = page.properties

  const titleProp = props["タイトル"] as { type: "title"; title: Array<{ plain_text: string }> }
  const title = titleProp?.title?.map((t) => t.plain_text).join("") ?? ""

  const statusProp = props["Status"] as { type: "status"; status: { name: string } | null }
  const status = (statusProp?.status?.name ?? null) as TaskStatus | null

  const priorityProp = props["Priority"] as { type: "select"; select: { name: string } | null }
  const priority = (priorityProp?.select?.name ?? null) as TaskPriority | null

  const dueProp = props["Due"] as { type: "date"; date: { start: string } | null }
  const due = dueProp?.date?.start ?? null

  const tagsProp = props["Tag"] as { type: "multi_select"; multi_select: Array<{ name: string }> }
  const tags = (tagsProp?.multi_select?.map((t) => t.name) ?? []) as TaskTag[]

  const assigneesProp = props["Assignee"] as { type: "people"; people: Array<{ id: string }> }
  const assignees = assigneesProp?.people?.map((p) => p.id) ?? []

  const sourceProp = props["Source"] as { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  const source = sourceProp?.rich_text?.map((t) => t.plain_text).join("") || null

  const sourceUrlProp = props["SourceURL"] as { type: "url"; url: string | null }
  const sourceUrl = sourceUrlProp?.url ?? null

  return {
    id: page.id,
    url: page.url,
    title,
    status,
    priority,
    due,
    tags,
    assignees,
    source,
    sourceUrl,
    parentTaskIds: extractRelationIds(props["親タスク"]),
    childTaskIds: extractRelationIds(props["子タスク"]),
    prevTaskIds: extractRelationIds(props["前タスク"]),
    nextTaskIds: extractRelationIds(props["次タスク"]),
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  }
}

export async function getTasks(options?: {
  statuses?: TaskStatus[]
  includeCompleted?: boolean
}): Promise<Task[]> {
  const activeStatuses: TaskStatus[] = options?.statuses ?? ["未着手", "進行中"]

  const response = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: {
      or: activeStatuses.map((s) => ({
        property: "Status",
        status: { equals: s },
      })),
    },
    sorts: [
      { property: "Priority", direction: "ascending" },
      { property: "Due", direction: "ascending" },
    ],
  })

  return response.results
    .filter((r): r is PageObjectResponse => r.object === "page" && "properties" in r)
    .map(pageToTask)
}

export async function getTask(id: string): Promise<Task | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    if (page.object !== "page" || !("properties" in page)) return null
    return pageToTask(page as PageObjectResponse)
  } catch {
    return null
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const properties: Record<string, unknown> = {
    タイトル: { title: [{ text: { content: input.title } }] },
  }

  if (input.status) properties["Status"] = { status: { name: input.status } }
  if (input.priority) properties["Priority"] = { select: { name: input.priority } }
  if (input.due) properties["Due"] = { date: { start: input.due } }
  if (input.tags?.length) properties["Tag"] = { multi_select: input.tags.map((t) => ({ name: t })) }
  if (input.source) properties["Source"] = { rich_text: [{ text: { content: input.source } }] }
  if (input.sourceUrl) properties["SourceURL"] = { url: input.sourceUrl }
  if (input.parentTaskId) properties["親タスク"] = { relation: [{ id: input.parentTaskId }] }

  const page = await notion.pages.create({
    parent: { data_source_id: DATA_SOURCE_ID, type: "data_source_id" },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  })

  return pageToTask(page as PageObjectResponse)
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const properties: Record<string, unknown> = {}

  if (input.title !== undefined) properties["タイトル"] = { title: [{ text: { content: input.title } }] }
  if (input.status !== undefined) properties["Status"] = { status: { name: input.status } }
  if (input.priority !== undefined) properties["Priority"] = { select: { name: input.priority } }
  if (input.due !== undefined) properties["Due"] = input.due ? { date: { start: input.due } } : { date: null }
  if (input.tags !== undefined) properties["Tag"] = { multi_select: input.tags.map((t) => ({ name: t })) }
  if (input.source !== undefined) properties["Source"] = { rich_text: [{ text: { content: input.source } }] }
  if (input.sourceUrl !== undefined) properties["SourceURL"] = { url: input.sourceUrl }

  const page = await notion.pages.update({
    page_id: id,
    properties: properties as Parameters<typeof notion.pages.update>[0]["properties"],
  })

  return pageToTask(page as PageObjectResponse)
}
