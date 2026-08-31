"use server"

import { updateTag } from "next/cache"
import { getRecurringStore, getTaskStore } from "@/lib/store"
import { requireAuth } from "@/lib/require-auth"
import { todayInTokyo } from "@/lib/recurrence"
import type { CreateRecurringTaskInput, RecurringTask, UpdateRecurringTaskInput } from "@/types/recurring"

export async function listRecurringAction(): Promise<RecurringTask[]> {
  await requireAuth()
  return (await getRecurringStore()).listRules()
}

export async function createRecurringAction(input: CreateRecurringTaskInput) {
  await requireAuth()
  await (await getRecurringStore()).createRule(input)
}

export async function updateRecurringAction(id: string, input: UpdateRecurringTaskInput) {
  await requireAuth()
  await (await getRecurringStore()).updateRule(id, input)
}

export async function deleteRecurringAction(id: string) {
  await requireAuth()
  await (await getRecurringStore()).deleteRule(id)
}

export async function setRecurringEnabledAction(id: string, enabled: boolean) {
  await requireAuth()
  await (await getRecurringStore()).updateRule(id, { enabled })
}

/**
 * cron を待たずに、今日ぶんまでの未生成タスクを生やす。
 * 冪等なので何度押しても増えない。
 */
export async function runRecurringNowAction(): Promise<{ created: number }> {
  await requireAuth()
  const result = await (await getRecurringStore()).generateDueTasks(todayInTokyo())
  if (result.created > 0) updateTag("tasks")
  return { created: result.created }
}

export async function fetchRecurringOptionsAction(): Promise<{ tagOptions: string[]; locationOptions: string[] }> {
  await requireAuth()
  const store = await getTaskStore()
  const [tagOptions, locationOptions] = await Promise.all([store.getTagOptions(), store.getLocationOptions()])
  return { tagOptions, locationOptions }
}
