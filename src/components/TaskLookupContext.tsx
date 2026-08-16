"use client"

import { createContext, useContext } from "react"
import type { Task } from "@/types/task"

// id → Task の全体ルックアップ。TaskManager で tasks + 補完取得した関連タスクを
// 合成して提供し、TaskBoard/BoardColumn を素通りして葉の TaskItem まで届ける
// (TasksRefreshContext / TaskRelationContext と同じ設計)。
const TaskLookupContext = createContext<Map<string, Task>>(new Map())

export function useTaskTitle(taskId: string | undefined): string | undefined {
  const taskById = useContext(TaskLookupContext)
  return taskId ? taskById.get(taskId)?.title : undefined
}

export const TaskLookupProvider = TaskLookupContext.Provider
