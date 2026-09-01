"use client"

import { forwardRef, useCallback, useLayoutEffect, useRef } from "react"
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
// バックログは left-most。「未着手にする前の待機列」のメンタルモデルで Kanban 流の左→右進行に合わせる。
// 起動時の初期スクロール位置は WIP カラム (進行中/未着手) に合わせる: バックログは
// 退避用で初期ロード対象外のため、可視領域から外して不要な lazy fetch を避ける狙いも兼ねる。
const COLUMNS: ColumnSpec[] = [
  { key: "backlog", statuses: ["バックログ"],         title: "バックログ",         accentStatus: "バックログ" },
  { key: "wip",     statuses: ["進行中", "未着手"],   title: "進行中 / 未着手",    accentStatus: "進行中" },
  { key: "review",  statuses: ["確認中"],             title: "確認中",             accentStatus: "確認中" },
  { key: "pause",   statuses: ["一時中断"],           title: "一時中断",           accentStatus: "一時中断" },
  { key: "done",    statuses: ["完了"],               title: "完了",               accentStatus: "完了" },
  { key: "cancel",  statuses: ["中止"],               title: "中止",               accentStatus: "中止" },
  { key: "skip",    statuses: ["対応不要"],           title: "対応不要",           accentStatus: "対応不要" },
]
const INITIAL_FOCUS_COLUMN_KEY = "wip"

export const TaskBoard = forwardRef<
  HTMLDivElement,
  {
    tasks: Task[]
    searchQuery: string
    advancedFilter: AdvancedFilter
    sort: SortConfig
    // 親が tasks を再取得するたびに増える世代カウンタ。lazy fetch カラムの再取得トリガ。
    refreshToken?: number
    isLoading?: boolean
    onSelect: (task: Task) => void
  }
>(function TaskBoard({ tasks, searchQuery, advancedFilter, sort, refreshToken, isLoading, onSelect }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // 起動時のスクロール位置を WIP カラムに合わせる。バックログは左端だが「退避列」で、
  // 開いた直後にユーザーが見たいのは進行中/未着手のため。paint 前に scrollLeft を当てて
  // 一瞬左端 (バックログ) が見えるチラつきを防ぐ。
  // ただし viewport が広く maxScroll < バックログ幅 のときは scrollLeft がクランプされて
  // バックログが左端で半分だけ見える「見切れ」状態になる。その場合は scroll を当てず
  // 全カラムを左から自然に並べる (PC 等の広い画面で発生)。
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const focus = container.querySelector<HTMLElement>(
      `[data-column-key="${INITIAL_FOCUS_COLUMN_KEY}"]`,
    )
    if (!focus) return
    const maxScroll = container.scrollWidth - container.clientWidth
    if (maxScroll < focus.offsetLeft) return
    container.scrollLeft = focus.offsetLeft
  }, [])

  return (
    <div
      ref={setRefs}
      data-testid="task-board"
      className="flex h-full overflow-x-auto overflow-y-hidden divide-x divide-[var(--border-strong)] snap-x snap-mandatory lg:snap-none"
      style={{ overscrollBehaviorX: "contain" }}
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
          refreshToken={refreshToken}
          isLoading={isLoading}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
})
