"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { updateTask, createTask, getTaskBlocks, updateTaskBlocks, getTaskComments, createTaskComment, getTasks, getTagOptions } from "@/lib/notion"
import type { AdvancedFilter, SortConfig, Task, TaskStatus, TaskComment, CreateTaskInput, UpdateTaskInput } from "@/types/task"

function isDevMode() {
  return process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development"
}

async function requireAuth() {
  if (isDevMode()) return
  const session = await auth()
  if (!session?.user) redirect("/login")
}

export async function setAdvancedFilterAction(filter: AdvancedFilter) {
  ;(await cookies()).set("filter_advanced", JSON.stringify(filter), { maxAge: 86400, path: "/" })
}

export async function setSortAction(sort: SortConfig) {
  ;(await cookies()).set("sort", JSON.stringify(sort), { maxAge: 86400, path: "/" })
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireAuth()
  try {
    await updateTask(id, { status })
  } catch (e) {
    console.error("[updateTaskStatus] Notion error:", e)
    throw e
  }
  updateTag("tasks")
}

export async function createTaskAction(input: CreateTaskInput) {
  await requireAuth()
  await createTask(input)
  updateTag("tasks")
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  await requireAuth()
  await updateTask(id, input)
  updateTag("tasks")
}

export async function refreshTasksAction() {
  await requireAuth()
  updateTag("tasks")
}

export async function fetchInitialDataAction(): Promise<{ tasks: Task[]; tagOptions: string[] }> {
  await requireAuth()
  const [tasks, tagOptions] = await Promise.all([getTasks(), getTagOptions()])
  return { tasks, tagOptions }
}

export async function getCompletedTasksAction(): Promise<Task[]> {
  await requireAuth()
  return getTasks({ statuses: ["完了"] })
}

export async function getCancelledTasksAction(): Promise<Task[]> {
  await requireAuth()
  return getTasks({ statuses: ["中止"] })
}

export async function getTaskBlocksAction(id: string): Promise<string> {
  await requireAuth()
  return getTaskBlocks(id)
}

export async function updateTaskBlocksAction(id: string, markdown: string): Promise<void> {
  await requireAuth()
  await updateTaskBlocks(id, markdown)
}

export async function getTaskCommentsAction(id: string): Promise<TaskComment[]> {
  await requireAuth()
  return getTaskComments(id)
}

export async function createTaskCommentAction(id: string, text: string): Promise<TaskComment> {
  if (isDevMode()) return createTaskComment(id, text, "dev-user")
  const session = await auth()
  if (!session?.user) redirect("/login")
  return createTaskComment(id, text, session.user.name ?? "Unknown")
}
