import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

// vi.hoisted でモジュール読み込み前にモックを定義
const { mockPages, mockDataSources } = vi.hoisted(() => ({
  mockPages: {
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockDataSources: {
    query: vi.fn(),
  },
}))

vi.mock("@notionhq/client", () => ({
  // new Client() が呼び出されるため通常の function が必要
  Client: vi.fn(function () {
    return { pages: mockPages, dataSources: mockDataSources }
  }),
}))

import { getTask, getTasks, createTask, updateTask } from "@/lib/notion"

// テスト用の Notion ページレスポンスを組み立てるヘルパー
function makePage(overrides: {
  id?: string
  url?: string
  title?: string
  status?: string | null
  priority?: string | null
  due?: string | null
  tags?: string[]
  assignees?: { id: string }[]
  source?: string | null
  sourceUrl?: string | null
  parentIds?: { id: string }[]
  childIds?: { id: string }[]
  prevIds?: { id: string }[]
  nextIds?: { id: string }[]
} = {}): PageObjectResponse {
  const d = {
    id: "page-1",
    url: "https://notion.so/page-1",
    title: "テストタスク",
    status: "未着手",
    priority: "high",
    due: "2024-12-31",
    tags: ["Tech"],
    assignees: [{ id: "user-1" }],
    source: null,
    sourceUrl: null,
    parentIds: [],
    childIds: [],
    prevIds: [],
    nextIds: [],
    ...overrides,
  }
  return {
    object: "page",
    id: d.id,
    url: d.url,
    created_time: "2024-01-01T00:00:00.000Z",
    last_edited_time: "2024-01-02T00:00:00.000Z",
    cover: null,
    icon: null,
    parent: { type: "database_id", database_id: "db-1" },
    archived: false,
    in_trash: false,
    properties: {
      "タイトル": {
        id: "title",
        type: "title",
        title: d.title ? [{ type: "text", plain_text: d.title, annotations: {}, href: null, text: { content: d.title, link: null } }] : [],
      },
      "Status": {
        id: "status",
        type: "status",
        status: d.status ? { id: "s1", name: d.status, color: "default" } : null,
      },
      "Priority": {
        id: "priority",
        type: "select",
        select: d.priority ? { id: "p1", name: d.priority, color: "default" } : null,
      },
      "Due": {
        id: "due",
        type: "date",
        date: d.due ? { start: d.due, end: null, time_zone: null } : null,
      },
      "Tag": {
        id: "tag",
        type: "multi_select",
        multi_select: d.tags.map((name) => ({ id: name, name, color: "default" })),
      },
      "Assignee": {
        id: "assignee",
        type: "people",
        people: d.assignees,
      },
      "Source": {
        id: "source",
        type: "rich_text",
        rich_text: d.source
          ? [{ type: "text", plain_text: d.source, annotations: {}, href: null, text: { content: d.source, link: null } }]
          : [],
      },
      "SourceURL": {
        id: "sourceUrl",
        type: "url",
        url: d.sourceUrl,
      },
      "親タスク": {
        id: "parent",
        type: "relation",
        relation: d.parentIds,
        has_more: false,
      },
      "子タスク": {
        id: "child",
        type: "relation",
        relation: d.childIds,
        has_more: false,
      },
      "前タスク": {
        id: "prev",
        type: "relation",
        relation: d.prevIds,
        has_more: false,
      },
      "次タスク": {
        id: "next",
        type: "relation",
        relation: d.nextIds,
        has_more: false,
      },
    },
  } as unknown as PageObjectResponse
}

// -------------------------------------------------------------------
// getTask のテスト（pageToTask / extractRelationIds を間接的に検証）
// -------------------------------------------------------------------
describe("getTask", () => {
  beforeEach(() => {
    mockPages.retrieve.mockReset()
  })

  it("存在しないページ（非pageオブジェクト）で null を返す", async () => {
    mockPages.retrieve.mockResolvedValue({ object: "database" })
    expect(await getTask("id-1")).toBeNull()
  })

  it("API エラー時に null を返す", async () => {
    mockPages.retrieve.mockRejectedValue(new Error("Not found"))
    expect(await getTask("id-1")).toBeNull()
  })

  it("タイトルを正しくマッピングする", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ title: "テストタイトル" }))
    const task = await getTask("id-1")
    expect(task?.title).toBe("テストタイトル")
  })

  it("複数のリッチテキストブロックを結合する", async () => {
    const page = makePage()
    page.properties["タイトル"] = {
      id: "title",
      type: "title",
      title: [
        { plain_text: "タスク", type: "text", annotations: {}, href: null, text: { content: "タスク", link: null } },
        { plain_text: "名称", type: "text", annotations: {}, href: null, text: { content: "名称", link: null } },
      ],
    } as unknown as typeof page.properties["タイトル"]
    mockPages.retrieve.mockResolvedValue(page)
    const task = await getTask("id-1")
    expect(task?.title).toBe("タスク名称")
  })

  it("status を正しくマッピングする", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ status: "進行中" }))
    const task = await getTask("id-1")
    expect(task?.status).toBe("進行中")
  })

  it("status が null の場合 null を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ status: null }))
    const task = await getTask("id-1")
    expect(task?.status).toBeNull()
  })

  it("priority を正しくマッピングする", async () => {
    for (const priority of ["high", "medium", "low"] as const) {
      mockPages.retrieve.mockResolvedValue(makePage({ priority }))
      const task = await getTask("id-1")
      expect(task?.priority).toBe(priority)
    }
  })

  it("priority が null の場合 null を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ priority: null }))
    const task = await getTask("id-1")
    expect(task?.priority).toBeNull()
  })

  it("due date を ISO 文字列で返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ due: "2024-06-15" }))
    const task = await getTask("id-1")
    expect(task?.due).toBe("2024-06-15")
  })

  it("due が null の場合 null を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ due: null }))
    const task = await getTask("id-1")
    expect(task?.due).toBeNull()
  })

  it("タグを配列で返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ tags: ["Tech", "Blog"] }))
    const task = await getTask("id-1")
    expect(task?.tags).toEqual(["Tech", "Blog"])
  })

  it("タグが空の場合 [] を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ tags: [] }))
    const task = await getTask("id-1")
    expect(task?.tags).toEqual([])
  })

  it("アサイニーの ID 配列を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ assignees: [{ id: "u1" }, { id: "u2" }] }))
    const task = await getTask("id-1")
    expect(task?.assignees).toEqual(["u1", "u2"])
  })

  it("source を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ source: "GitHub" }))
    const task = await getTask("id-1")
    expect(task?.source).toBe("GitHub")
  })

  it("source が空の場合 null を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ source: null }))
    const task = await getTask("id-1")
    expect(task?.source).toBeNull()
  })

  it("sourceUrl を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage({ sourceUrl: "https://example.com" }))
    const task = await getTask("id-1")
    expect(task?.sourceUrl).toBe("https://example.com")
  })

  it("id と url を返す", async () => {
    mockPages.retrieve.mockResolvedValue(
      makePage({ id: "abc-123", url: "https://notion.so/abc-123" })
    )
    const task = await getTask("abc-123")
    expect(task?.id).toBe("abc-123")
    expect(task?.url).toBe("https://notion.so/abc-123")
  })

  it("createdTime / lastEditedTime を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage())
    const task = await getTask("id-1")
    expect(task?.createdTime).toBe("2024-01-01T00:00:00.000Z")
    expect(task?.lastEditedTime).toBe("2024-01-02T00:00:00.000Z")
  })

  // --- extractRelationIds の検証 ---

  it("親タスク ID を配列で返す", async () => {
    mockPages.retrieve.mockResolvedValue(
      makePage({ parentIds: [{ id: "parent-1" }, { id: "parent-2" }] })
    )
    const task = await getTask("id-1")
    expect(task?.parentTaskIds).toEqual(["parent-1", "parent-2"])
  })

  it("子タスク ID を配列で返す", async () => {
    mockPages.retrieve.mockResolvedValue(
      makePage({ childIds: [{ id: "child-1" }] })
    )
    const task = await getTask("id-1")
    expect(task?.childTaskIds).toEqual(["child-1"])
  })

  it("前タスク・次タスク ID を配列で返す", async () => {
    mockPages.retrieve.mockResolvedValue(
      makePage({ prevIds: [{ id: "prev-1" }], nextIds: [{ id: "next-1" }] })
    )
    const task = await getTask("id-1")
    expect(task?.prevTaskIds).toEqual(["prev-1"])
    expect(task?.nextTaskIds).toEqual(["next-1"])
  })

  it("リレーションが空の場合 [] を返す", async () => {
    mockPages.retrieve.mockResolvedValue(makePage())
    const task = await getTask("id-1")
    expect(task?.parentTaskIds).toEqual([])
    expect(task?.childTaskIds).toEqual([])
    expect(task?.prevTaskIds).toEqual([])
    expect(task?.nextTaskIds).toEqual([])
  })

  it("リレーションプロパティが欠損している場合 [] を返す", async () => {
    const page = makePage()
    delete (page.properties as Record<string, unknown>)["親タスク"]
    mockPages.retrieve.mockResolvedValue(page)
    const task = await getTask("id-1")
    expect(task?.parentTaskIds).toEqual([])
  })
})

// -------------------------------------------------------------------
// getTasks のテスト
// -------------------------------------------------------------------
describe("getTasks", () => {
  beforeEach(() => {
    mockDataSources.query.mockReset()
  })

  it("ページオブジェクトのみを Task に変換して返す", async () => {
    mockDataSources.query.mockResolvedValue({
      results: [
        makePage({ id: "t1", title: "タスク1" }),
        { object: "database" }, // 非ページオブジェクトは除外される
        makePage({ id: "t2", title: "タスク2" }),
      ],
    })
    const tasks = await getTasks()
    expect(tasks).toHaveLength(2)
    expect(tasks[0].title).toBe("タスク1")
    expect(tasks[1].title).toBe("タスク2")
  })

  it("デフォルトで未着手・進行中のフィルターをクエリに渡す", async () => {
    mockDataSources.query.mockResolvedValue({ results: [] })
    await getTasks()
    const call = mockDataSources.query.mock.calls[0][0]
    const statuses = call.filter.or.map((f: { status: { equals: string } }) => f.status.equals)
    expect(statuses).toContain("未着手")
    expect(statuses).toContain("進行中")
  })

  it("statuses オプションで任意のフィルターを渡せる", async () => {
    mockDataSources.query.mockResolvedValue({ results: [] })
    await getTasks({ statuses: ["確認中", "一時中断"] })
    const call = mockDataSources.query.mock.calls[0][0]
    const statuses = call.filter.or.map((f: { status: { equals: string } }) => f.status.equals)
    expect(statuses).toEqual(["確認中", "一時中断"])
  })

  it("Priority と Due の昇順ソートをクエリに渡す", async () => {
    mockDataSources.query.mockResolvedValue({ results: [] })
    await getTasks()
    const { sorts } = mockDataSources.query.mock.calls[0][0]
    expect(sorts).toContainEqual({ property: "Priority", direction: "ascending" })
    expect(sorts).toContainEqual({ property: "Due", direction: "ascending" })
  })
})

// -------------------------------------------------------------------
// createTask のテスト
// -------------------------------------------------------------------
describe("createTask", () => {
  beforeEach(() => {
    mockPages.create.mockReset()
  })

  it("タイトルを正しいプロパティ形式で送信する", async () => {
    mockPages.create.mockResolvedValue(makePage({ title: "新しいタスク" }))
    await createTask({ title: "新しいタスク" })
    const props = mockPages.create.mock.calls[0][0].properties
    expect(props["タイトル"]).toEqual({
      title: [{ text: { content: "新しいタスク" } }],
    })
  })

  it("status を指定した場合にプロパティに含める", async () => {
    mockPages.create.mockResolvedValue(makePage({ status: "進行中" }))
    await createTask({ title: "タスク", status: "進行中" })
    const props = mockPages.create.mock.calls[0][0].properties
    expect(props["Status"]).toEqual({ status: { name: "進行中" } })
  })

  it("省略可能なフィールドは省略した場合にプロパティに含めない", async () => {
    mockPages.create.mockResolvedValue(makePage())
    await createTask({ title: "タスク" })
    const props = mockPages.create.mock.calls[0][0].properties
    expect(props["Status"]).toBeUndefined()
    expect(props["Priority"]).toBeUndefined()
    expect(props["Due"]).toBeUndefined()
  })

  it("tags を multi_select 形式で送信する", async () => {
    mockPages.create.mockResolvedValue(makePage({ tags: ["Tech", "Blog"] }))
    await createTask({ title: "タスク", tags: ["Tech", "Blog"] })
    const props = mockPages.create.mock.calls[0][0].properties
    expect(props["Tag"]).toEqual({
      multi_select: [{ name: "Tech" }, { name: "Blog" }],
    })
  })

  it("parentTaskId をリレーション形式で送信する", async () => {
    mockPages.create.mockResolvedValue(makePage())
    await createTask({ title: "子タスク", parentTaskId: "parent-abc" })
    const props = mockPages.create.mock.calls[0][0].properties
    expect(props["親タスク"]).toEqual({ relation: [{ id: "parent-abc" }] })
  })
})

// -------------------------------------------------------------------
// updateTask のテスト
// -------------------------------------------------------------------
describe("updateTask", () => {
  beforeEach(() => {
    mockPages.update.mockReset()
  })

  it("status を更新する", async () => {
    mockPages.update.mockResolvedValue(makePage({ status: "完了" }))
    await updateTask("id-1", { status: "完了" })
    const props = mockPages.update.mock.calls[0][0].properties
    expect(props["Status"]).toEqual({ status: { name: "完了" } })
  })

  it("due を null でクリアできる", async () => {
    mockPages.update.mockResolvedValue(makePage({ due: null }))
    await updateTask("id-1", { due: null })
    const props = mockPages.update.mock.calls[0][0].properties
    expect(props["Due"]).toEqual({ date: null })
  })

  it("指定されていないフィールドはプロパティに含めない", async () => {
    mockPages.update.mockResolvedValue(makePage())
    await updateTask("id-1", { status: "完了" })
    const props = mockPages.update.mock.calls[0][0].properties
    expect(props["タイトル"]).toBeUndefined()
    expect(props["Priority"]).toBeUndefined()
  })
})
