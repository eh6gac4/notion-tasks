import { useEffect, useMemo, useRef, useState } from "react"
import type { Task } from "@/types/task"
import { getTasksByIdsAction } from "@/app/actions"

/**
 * id → Task のルックアップを構築する。baseTasks に無い id (完了/中止/バックログ等
 * lazy fetch 対象で親一覧に含まれない場合) は getTasksByIdsAction で補完取得する。
 * 一度取得を試みた id は結果の有無に関わらず再試行しない (削除済みタスク等で
 * 永久に見つからない id による無限リトライを防ぐ)。
 */
export function useTaskLookup(baseTasks: Task[], idsToResolve: string[]): Map<string, Task> {
  const [extraTasks, setExtraTasks] = useState<Record<string, Task>>({})
  const attemptedIdsRef = useRef<Set<string>>(new Set())

  const taskById = useMemo(() => {
    const m = new Map<string, Task>()
    for (const t of baseTasks) m.set(t.id, t)
    for (const t of Object.values(extraTasks)) m.set(t.id, t)
    return m
  }, [baseTasks, extraTasks])

  useEffect(() => {
    const missing = idsToResolve.filter(
      (id) => !taskById.has(id) && !attemptedIdsRef.current.has(id)
    )
    if (missing.length === 0) return
    for (const id of missing) attemptedIdsRef.current.add(id)
    getTasksByIdsAction(missing).then((fetched) => {
      if (fetched.length === 0) return
      setExtraTasks((prev) => {
        const next = { ...prev }
        for (const t of fetched) next[t.id] = t
        return next
      })
    })
  }, [idsToResolve, taskById])

  return taskById
}
