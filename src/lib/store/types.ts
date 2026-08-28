import type {
  CreateTaskInput,
  Task,
  TaskAttachment,
  TaskComment,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task"

/**
 * タスクの永続化層インターフェース。
 *
 * これまで `src/lib/notion.ts` が事実上の唯一の実装で、`src/app/actions.ts` が
 * 直接 import していた。バックエンド差し替え(Notion → D1)を可能にするため、
 * 既存の 12 エクスポートをそのままの signature で型として切り出したもの。
 *
 * 実装:
 * - `notion.ts` : 既存 Notion API 実装(dev では in-memory mock に委譲)
 * - `d1.ts`     : Cloudflare D1 + R2 実装
 */
export interface TaskStore {
  getTasks(options?: { statuses?: TaskStatus[] }): Promise<Task[]>
  getTask(id: string): Promise<Task | null>
  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>

  /** multi_select / select の選択肢一覧(フィルタ UI 用) */
  getTagOptions(): Promise<string[]>
  getLocationOptions(): Promise<string[]>

  /** タスク本文(Markdown)。Notion 実装では block ツリーと相互変換される。 */
  getTaskBlocks(id: string): Promise<string>
  updateTaskBlocks(id: string, markdown: string): Promise<void>

  getTaskComments(id: string): Promise<TaskComment[]>
  createTaskComment(id: string, text: string, author?: string): Promise<TaskComment>

  /** 添付ファイル。戻り値は更新後の全件。 */
  uploadTaskAttachment(taskId: string, file: File): Promise<TaskAttachment[]>
  removeTaskAttachment(taskId: string, index: number): Promise<TaskAttachment[]>
}

/** 添付ファイルの実体を返せる store(proxy route `/api/file/[pageId]/[index]` 用) */
export interface AttachmentReadableStore {
  readAttachment(
    taskId: string,
    index: number,
  ): Promise<{ data: ArrayBuffer; contentType: string; name: string } | null>
}
