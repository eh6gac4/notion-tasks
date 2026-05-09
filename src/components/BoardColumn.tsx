"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { applyAdvancedFilter } from "@/constants/filters"
import { applySort } from "@/lib/task-sort"
import { getCompletedTasksAction } from "@/app/actions"

const STATUS_ACCENT: Record<TaskStatus, string> = {
  "未着手":         "var(--status-todo)",
  "進行中":         "var(--status-doing)",
  "確認中":         "var(--status-review)",
  "一時中断":       "var(--status-pause)",
  "完了":           "var(--status-done)",
  "中止":           "var(--status-cancel)",
  "アーカイブ済み": "var(--text-faint)",
}

export function BoardColumn({
  status,
  tasks,
  searchQuery,
  advancedFilter,
  sort,
  onSelect,
}: {
  status: TaskStatus
  tasks: Task[]
  searchQuery: string
  advancedFilter: AdvancedFilter
  sort: SortConfig
  onSelect: (id: string) => void
}) {
  // 完了カラムは初回ページ取得から除外しているため、カラムが viewport に
  // 入ったタイミングで一度だけ fetch する (ページ初期化を軽くする目的)。
  // ただし tasks prop が既に完了タスクを含む場合 (= テスト/明示的 fetch 済み)
  // はそれをそのまま使い、lazy load はスキップする。
  const isCompleted = status === "完了"
  const propCompletedTasks = useMemo(
    () => (isCompleted ? tasks.filter((t) => t.status === "完了") : []),
    [isCompleted, tasks]
  )
  const propsHasCompleted = propCompletedTasks.length > 0
  const [lazyTasks, setLazyTasks] = useState<Task[] | null>(null)
  const [isLoadingLazy, setIsLoadingLazy] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isCompleted) return
    if (propsHasCompleted) return
    if (lazyTasks !== null) return
    const el = sectionRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      obs.disconnect()
      setIsLoadingLazy(true)
      getCompletedTasksAction()
        .then((t) => setLazyTasks(t))
        .catch(() => setHasLoadError(true))
        .finally(() => setIsLoadingLazy(false))
    }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [isCompleted, propsHasCompleted, lazyTasks])

  const q = searchQuery.trim().toLowerCase()
  const filtered = useMemo(() => {
    let source: Task[]
    if (isCompleted) {
      source = propsHasCompleted ? propCompletedTasks : (lazyTasks ?? [])
    } else {
      source = tasks.filter((t) => t.status === status)
    }
    const byAdvanced = applyAdvancedFilter(source, advancedFilter)
    const bySearch = q === "" ? byAdvanced : byAdvanced.filter((t) => t.title.toLowerCase().includes(q))
    return applySort(bySearch, sort)
  }, [isCompleted, propsHasCompleted, propCompletedTasks, lazyTasks, tasks, status, advancedFilter, q, sort])

  const accent = STATUS_ACCENT[status]
  const isLazyPending = isCompleted && !propsHasCompleted && lazyTasks === null
  const showLazyLoading = isLazyPending && !hasLoadError
  const showLazyError = isLazyPending && hasLoadError

  return (
    <section
      ref={sectionRef}
      data-testid="board-column"
      data-status={status}
      className="flex-shrink-0 w-[360px] h-full flex flex-col snap-start"
      style={{ scrollSnapAlign: "start" }}
    >
      <header
        className="sticky top-0 z-10 px-3 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: accent }}
        />
        <span className="font-pixel text-xs tracking-widest uppercase" style={{ color: accent }}>
          {status}
        </span>
        <span className="font-pixel text-[11px] text-[var(--text-faint)] tabular-nums">
          {isLazyPending ? "" : filtered.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {showLazyLoading ? (
          <p className="font-pixel text-center text-[var(--text-faint)] text-[11px] py-6 tracking-widest">
            — LOADING —
          </p>
        ) : showLazyError ? (
          <p className="font-pixel text-center text-[var(--status-cancel)] text-[11px] py-6 tracking-widest">
            — LOAD FAILED —
          </p>
        ) : filtered.length === 0 ? (
          <p className="font-pixel text-center text-[var(--text-faint)] text-[11px] py-6 tracking-widest">
            {q !== "" ? "— NO MATCH —" : "—"}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((task) => (
              <li key={task.id}>
                <TaskItem task={task} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
