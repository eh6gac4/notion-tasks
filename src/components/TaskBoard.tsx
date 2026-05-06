"use client"

import { forwardRef } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { BoardColumn } from "./BoardColumn"

const COLUMNS: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]

export const TaskBoard = forwardRef<
  HTMLDivElement,
  {
    tasks: Task[]
    searchQuery: string
    advancedFilter: AdvancedFilter
    sort: SortConfig
    onSelect: (id: string) => void
  }
>(function TaskBoard({ tasks, searchQuery, advancedFilter, sort, onSelect }, ref) {
  return (
    <div
      ref={ref}
      data-testid="task-board"
      className="flex h-full overflow-x-auto overflow-y-hidden divide-x divide-[var(--border)]"
      style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
    >
      {COLUMNS.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          tasks={tasks}
          searchQuery={searchQuery}
          advancedFilter={advancedFilter}
          sort={sort}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
})
