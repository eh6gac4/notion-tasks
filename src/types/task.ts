export type TaskStatus =
  | "未着手"
  | "進行中"
  | "確認中"
  | "一時中断"
  | "完了"
  | "中止"
  | "アーカイブ済み"

export type TaskPriority = "high" | "medium" | "low"

export type Task = {
  id: string
  url: string
  title: string
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
}

export type CreateTaskInput = {
  title: string
  status?: TaskStatus
  priority?: TaskPriority
  due?: string | null
  tags?: string[]
  body?: string
  source?: string
  sourceUrl?: string
  parentTaskId?: string
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "title"> & { title: string }>

export type TaskComment = {
  id: string
  text: string
  author: string
  createdTime: string
}
