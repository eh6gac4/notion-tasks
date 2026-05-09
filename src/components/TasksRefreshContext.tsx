"use client"

import { createContext, useContext } from "react"

// ミューテーション後に TaskManager の tasks/tagOptions を再取得するためのコールバック。
// 子コンポーネント (TaskCreate, TaskItem, TaskDetail) はこの hook 経由で
// refresh() を呼び、TaskManager 側がローカル state を更新する。
const TasksRefreshContext = createContext<() => void>(() => {})

export function useTasksRefresh(): () => void {
  return useContext(TasksRefreshContext)
}

export const TasksRefreshProvider = TasksRefreshContext.Provider
