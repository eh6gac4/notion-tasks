"use client"

import { useMemo } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { applyAdvancedFilter } from "@/constants/filters"
import { applySort } from "@/lib/task-sort"

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
  const q = searchQuery.trim().toLowerCase()
  const filtered = useMemo(() => {
    const byStatus = tasks.filter((t) => t.status === status)
    const byAdvanced = applyAdvancedFilter(byStatus, advancedFilter)
    const bySearch = q === "" ? byAdvanced : byAdvanced.filter((t) => t.title.toLowerCase().includes(q))
    return applySort(bySearch, sort)
  }, [tasks, status, advancedFilter, q, sort])

  const accent = STATUS_ACCENT[status]

  return (
    <section
      data-testid="board-column"
      data-status={status}
      className="flex-shrink-0 w-[280px] h-full flex flex-col snap-start"
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
          {filtered.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {filtered.length === 0 ? (
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
