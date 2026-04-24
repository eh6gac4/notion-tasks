"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { updateTask, createTask, getTaskBlocks, updateTaskBlocks, getTaskComments, createTaskComment } from "@/lib/notion"
import type { TaskStatus, TaskComment, CreateTaskInput, UpdateTaskInput } from "@/types/task"

function isDevMode() {
  return process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development"
}

async function requireAuth() {
  if (isDevMode()) return
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
}

export async function setFilterAction(filter: string) {
  ;(await cookies()).set("filter", filter, { maxAge: 86400, path: "/" })
  revalidatePath("/")
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireAuth()
  try {
    await updateTask(id, { status })
  } catch (e) {
    console.error("[updateTaskStatus] Notion error:", e)
    throw e
  }
  revalidateTag("tasks", "default")
  revalidatePath("/")
}

export async function createTaskAction(input: CreateTaskInput) {
  await requireAuth()
  await createTask(input)
  revalidateTag("tasks", "default")
  revalidatePath("/")
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  await requireAuth()
  await updateTask(id, input)
  revalidateTag("tasks", "default")
  revalidatePath("/")
}

export async function refreshTasksAction() {
  await requireAuth()
  revalidateTag("tasks", "default")
  revalidatePath("/")
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
  if (!session?.user) throw new Error("Unauthorized")
  return createTaskComment(id, text, session.user.name ?? "Unknown")
}
