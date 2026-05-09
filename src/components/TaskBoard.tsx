"use client"

import { forwardRef } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { BoardColumn } from "./BoardColumn"

export type ColumnSpec = {
  key: string
  statuses: TaskStatus[]
  title: string
  // ヘッダのドット色に使うステータス。複数 status を束ねるカラムでは代表色。
  accentStatus: TaskStatus
}

// 進行中・未着手は同じカラムにまとめて表示する (進行中が上)。
const COLUMNS: ColumnSpec[] = [
  { key: "wip",    statuses: ["進行中", "未着手"], title: "進行中 / 未着手", accentStatus: "進行中" },
  { key: "review", statuses: ["確認中"],           title: "確認中",            accentStatus: "確認中" },
  { key: "pause",  statuses: ["一時中断"],         title: "一時中断",          accentStatus: "一時中断" },
  { key: "done",   statuses: ["完了"],             title: "完了",              accentStatus: "完了" },
  { key: "cancel", statuses: ["中止"],             title: "中止",              accentStatus: "中止" },
]

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
      className="flex h-full overflow-x-auto overflow-y-hidden divide-x divide-[var(--border-strong)]"
      style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
    >
      {COLUMNS.map((col) => (
        <BoardColumn
          key={col.key}
          columnKey={col.key}
          title={col.title}
          statuses={col.statuses}
          accentStatus={col.accentStatus}
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
