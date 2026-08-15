"use client"

import { createContext, useContext } from "react"
import type { TaskRelation } from "@/lib/task-relation"

// 選択中タスクを基準にした id → 関係 のマップ。TaskManager で計算し、
// TaskBoard/BoardColumn を素通りして葉の TaskItem まで届ける
// (TasksRefreshContext と同じ設計: cross-cutting な値は props drilling せず Context 化する)。
const TaskRelationContext = createContext<Map<string, TaskRelation>>(new Map())

export function useTaskRelation(taskId: string): TaskRelation | undefined {
  return useContext(TaskRelationContext).get(taskId)
}

export const TaskRelationProvider = TaskRelationContext.Provider
