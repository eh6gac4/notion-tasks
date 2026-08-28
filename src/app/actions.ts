"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isNotionClientError } from "@notionhq/client"
import { getTaskStore } from "@/lib/store"
import { isDevMode, requireAuth } from "@/lib/require-auth"
import type { AdvancedFilter, SortConfig, Task, TaskAttachment, TaskStatus, TaskComment, CreateTaskInput, UpdateTaskInput } from "@/types/task"

export async function setAdvancedFilterAction(filter: AdvancedFilter) {
  ;(await cookies()).set("filter_advanced", JSON.stringify(filter), { maxAge: 86400, path: "/" })
}

export async function setSortAction(sort: SortConfig) {
  ;(await cookies()).set("sort", JSON.stringify(sort), { maxAge: 86400, path: "/" })
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireAuth()
  try {
    await (await getTaskStore()).updateTask(id, { status })
  } catch (e) {
    console.error("[updateTaskStatus] Notion error:", e)
    throw e
  }
  updateTag("tasks")
}

export async function createTaskAction(input: CreateTaskInput) {
  await requireAuth()
  await (await getTaskStore()).createTask(input)
  updateTag("tasks")
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  await requireAuth()
  await (await getTaskStore()).updateTask(id, input)
  updateTag("tasks")
}

export async function refreshTasksAction() {
  await requireAuth()
  updateTag("tasks")
}

export async function fetchInitialDataAction(): Promise<{ tasks: Task[]; tagOptions: string[]; locationOptions: string[] }> {
  await requireAuth()
  const store = await getTaskStore()
  const [tasks, tagOptions, locationOptions] = await Promise.all([store.getTasks(), store.getTagOptions(), store.getLocationOptions()])
  return { tasks, tagOptions, locationOptions }
}

export async function getCompletedTasksAction(): Promise<Task[]> {
  await requireAuth()
  return (await getTaskStore()).getTasks({ statuses: ["完了"] })
}

export async function getCancelledTasksAction(): Promise<Task[]> {
  await requireAuth()
  return (await getTaskStore()).getTasks({ statuses: ["中止"] })
}

export async function getBacklogTasksAction(): Promise<Task[]> {
  await requireAuth()
  return (await getTaskStore()).getTasks({ statuses: ["バックログ"] })
}

export async function getSkipTasksAction(): Promise<Task[]> {
  await requireAuth()
  return (await getTaskStore()).getTasks({ statuses: ["対応不要"] })
}

export async function getTasksByIdsAction(ids: string[]): Promise<Task[]> {
  await requireAuth()
  if (ids.length === 0) return []
  const store = await getTaskStore()
  const tasks = await Promise.all(ids.map((id) => store.getTask(id)))
  return tasks.filter((t): t is Task => t !== null)
}

export async function getTaskBlocksAction(id: string): Promise<string> {
  await requireAuth()
  return (await getTaskStore()).getTaskBlocks(id)
}

export async function updateTaskBlocksAction(id: string, markdown: string): Promise<void> {
  await requireAuth()
  await (await getTaskStore()).updateTaskBlocks(id, markdown)
}

export async function getTaskCommentsAction(id: string): Promise<TaskComment[]> {
  await requireAuth()
  return (await getTaskStore()).getTaskComments(id)
}

export async function createTaskCommentAction(id: string, text: string): Promise<TaskComment> {
  if (isDevMode()) return (await getTaskStore()).createTaskComment(id, text, "dev-user")
  const session = await auth()
  if (!session?.user) redirect("/login")
  return (await getTaskStore()).createTaskComment(id, text, session.user.name ?? "Unknown")
}

export async function uploadTaskAttachmentAction(
  taskId: string,
  formData: FormData,
): Promise<TaskAttachment[]> {
  await requireAuth()
  const file = formData.get("file")
  console.error("[uploadTaskAttachmentAction] file type:", typeof file, file?.constructor?.name, "isFile:", file instanceof File, "isBlob:", file instanceof Blob)
  try {
    if (!(file instanceof File)) throw new Error(`ファイルが見つかりません (got ${file?.constructor?.name ?? typeof file})`)
    const attachments = await (await getTaskStore()).uploadTaskAttachment(taskId, file)
    updateTag("tasks")
    return attachments
  } catch (e) {
    console.error("[uploadTaskAttachmentAction] failed:", e)
    if (isNotionClientError(e)) {
      throw new Error(`Notion エラー: ${e.message}`)
    }
    throw e
  }
}

export async function removeTaskAttachmentAction(
  taskId: string,
  index: number,
): Promise<TaskAttachment[]> {
  await requireAuth()
  try {
    const attachments = await (await getTaskStore()).removeTaskAttachment(taskId, index)
    updateTag("tasks")
    return attachments
  } catch (e) {
    console.error("[removeTaskAttachmentAction] failed:", e)
    if (isNotionClientError(e)) {
      throw new Error(`Notion エラー: ${e.message}`)
    }
    throw e
  }
}
