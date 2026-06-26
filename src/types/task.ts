export type TaskStatus =
  | "バックログ"
  | "未着手"
  | "進行中"
  | "確認中"
  | "一時中断"
  | "完了"
  | "中止"
  | "アーカイブ済み"

export type TaskPriority = "high" | "medium" | "low"

// Notion ページの icon を正規化したもの。
// - emoji: ネイティブ絵文字 (string)
// - url:   external (CDN) または file (Notion S3、署名付き) の画像 URL
export type TaskIcon =
  | { type: "emoji"; emoji: string }
  | { type: "url"; url: string }

export type Task = {
  id: string
  url: string
  title: string
  icon: TaskIcon | null
  status: TaskStatus | null
  priority: TaskPriority | null
  due: string | null
  tags: string[]
  assignees: string[]
  source: string | null
  sourceUrl: string | null
  parentTaskIds: string[]
  childTaskIds: string[]
  prevTaskIds: string[]
  nextTaskIds: string[]
  createdTime: string
  lastEditedTime: string
  attachments: TaskAttachment[]
}

export type CreateTaskInput = {
  title: string
  status?: TaskStatus
  priority?: TaskPriority | null
  due?: string | null
  tags?: string[]
  body?: string
  source?: string
  sourceUrl?: string
  parentTaskId?: string
}

export type UpdateTaskInput = {
  title?: string
  status?: TaskStatus
  priority?: TaskPriority | null
  due?: string | null
  tags?: string[]
  body?: string
  source?: string
  sourceUrl?: string
  parentTaskId?: string | null
}

export type TaskAttachment = {
  /** ファイル名 */
  name: string
  /** 安定 proxy URL (/api/file/[pageId]/[index]) */
  url: string
  /** 拡張子から判定した画像フラグ */
  isImage: boolean
}

export type TaskComment = {
  id: string
  text: string
  author: string
  createdTime: string
}

export type DueDateMode = "any" | "with" | "overdue" | "without"

export type AdvancedFilter = {
  tags: string[]
  dueDate: DueDateMode
  priorities: TaskPriority[]
}

export type SortKey = "default" | "due" | "priority"
export type SortDirection = "asc" | "desc"
export type SortConfig = { key: SortKey; direction: SortDirection }
