"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { updateTask, createTask } from "@/lib/notion"
import type { TaskStatus, CreateTaskInput, UpdateTaskInput } from "@/types/task"

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireAuth()
  await updateTask(id, { status })
  revalidatePath("/")
}

export async function createTaskAction(input: CreateTaskInput) {
  await requireAuth()
  await createTask(input)
  revalidatePath("/")
}

export async function updateTaskAction(id: string, input: UpdateTaskInput) {
  await requireAuth()
  await updateTask(id, input)
  revalidatePath("/")
}
