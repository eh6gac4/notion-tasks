import type { Task, TaskStatus, TaskComment, CreateTaskInput, UpdateTaskInput } from "@/types/task"

const now = new Date().toISOString()

const INITIAL_TASKS: Task[] = [
  {
    id: "mock-1",
    url: "https://notion.so/mock-1",
    title: "【DEV】ルーターのファームウェア更新",
    status: "未着手",
    priority: "high",
    due: "2026-04-25",
    tags: ["Network"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-2",
    url: "https://notion.so/mock-2",
    title: "【DEV】技術ブログ記事を書く",
    status: "未着手",
    priority: "medium",
    due: null,
    tags: ["Blog", "Tech"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: ["mock-3"],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-3",
    url: "https://notion.so/mock-3",
    title: "【DEV】ドラフト作成",
    status: "未着手",
    priority: "low",
    due: null,
    tags: ["Blog"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: ["mock-2"],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-4",
    url: "https://notion.so/mock-4",
    title: "【DEV】家計簿の月次集計",
    status: "進行中",
    priority: "high",
    due: "2026-04-30",
    tags: ["Finance"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-5",
    url: "https://notion.so/mock-5",
    title: "【DEV】サーバー監視ダッシュボード改善",
    status: "進行中",
    priority: "medium",
    due: null,
    tags: ["Tech", "Operation"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-6",
    url: "https://notion.so/mock-6",
    title: "【DEV】デプロイ手順の見直し",
    status: "確認中",
    priority: "medium",
    due: null,
    tags: ["Operation"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-7",
    url: "https://notion.so/mock-7",
    title: "【DEV】外付けHDD整理",
    status: "一時中断",
    priority: "low",
    due: null,
    tags: ["Operation"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
  {
    id: "mock-8",
    url: "https://notion.so/mock-8",
    title: "【DEV】DNS設定変更（完了済みサンプル）",
    status: "完了",
    priority: "high",
    due: "2026-04-10",
    tags: ["Network"],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: now,
    lastEditedTime: now,
  },
]

let store: Task[] = INITIAL_TASKS.map((t) => ({ ...t }))
let nextId = 100

const mockBlockStore = new Map<string, string>([
  ["mock-1", "## 作業メモ\n\n- ファームウェアバージョン確認\n- バックアップ取得後に適用"],
  ["mock-2", "## 構成\n\n- 導入\n- 本題\n- まとめ"],
])

let mockCommentNextId = 1
const mockCommentStore = new Map<string, TaskComment[]>([
  ["mock-1", [
    { id: "c-1", text: "ファームウェア 3.2.1 を確認。公式サイトに最新版あり。", author: "自分", createdTime: "2026-04-24T10:00:00.000Z" },
  ]],
  ["mock-4", [
    { id: "c-2", text: "4月分の入力完了。残りは通信費の確認のみ。", author: "自分", createdTime: "2026-04-24T09:30:00.000Z" },
  ]],
])

export function resetMockTasks() {
  store = INITIAL_TASKS.map((t) => ({ ...t }))
  nextId = 100
}

export function getMockTasks(statuses?: TaskStatus[]): Task[] {
  if (!statuses) return [...store]
  return store.filter((t) => t.status !== null && statuses.includes(t.status))
}

export function getMockTask(id: string): Task | undefined {
  return store.find((t) => t.id === id)
}

export function createMockTask(input: CreateTaskInput): Task {
  const ts = new Date().toISOString()
  const task: Task = {
    id: `mock-${++nextId}`,
    url: `https://notion.so/mock-${nextId}`,
    title: input.title,
    status: input.status ?? "未着手",
    priority: input.priority ?? null,
    due: input.due ?? null,
    tags: input.tags ?? [],
    assignees: [],
    source: input.source ?? null,
    sourceUrl: input.sourceUrl ?? null,
    parentTaskIds: input.parentTaskId ? [input.parentTaskId] : [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: ts,
    lastEditedTime: ts,
  }
  store.push(task)
  if (input.body?.trim()) mockBlockStore.set(task.id, input.body)
  return task
}

export function getMockTaskBlocks(id: string): string {
  return mockBlockStore.get(id) ?? ""
}

export function updateMockTaskBlocks(id: string, content: string): void {
  mockBlockStore.set(id, content)
}

export function getMockTaskComments(id: string): TaskComment[] {
  return mockCommentStore.get(id) ?? []
}

export function addMockTaskComment(id: string, text: string): TaskComment {
  const comment: TaskComment = {
    id: `c-${++mockCommentNextId}`,
    text,
    author: "自分",
    createdTime: new Date().toISOString(),
  }
  const existing = mockCommentStore.get(id) ?? []
  mockCommentStore.set(id, [...existing, comment])
  return comment
}

export function updateMockTask(id: string, input: UpdateTaskInput): Task | null {
  const idx = store.findIndex((t) => t.id === id)
  if (idx === -1) return null
  const ts = new Date().toISOString()
  store[idx] = {
    ...store[idx],
    ...(input.title !== undefined && { title: input.title }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.due !== undefined && { due: input.due }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.source !== undefined && { source: input.source }),
    ...(input.sourceUrl !== undefined && { sourceUrl: input.sourceUrl }),
    lastEditedTime: ts,
  }
  return store[idx]
}
