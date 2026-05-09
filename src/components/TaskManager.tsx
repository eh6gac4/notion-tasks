"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { AdvancedFilter, SortConfig, Task } from "@/types/task"
import { TaskBoard } from "./TaskBoard"
import { TaskDetail } from "./TaskDetail"
import { TaskCreate } from "./TaskCreate"
import { TaskFilterSheet } from "./TaskFilterSheet"
import { TaskSortSheet } from "./TaskSortSheet"
import { setAdvancedFilterAction, setSortAction, refreshTasksAction } from "@/app/actions"
import { isAdvancedFilterActive } from "@/constants/filters"
import { isSortActive } from "@/lib/task-sort"

export function TaskManager({
  tasks,
  tagOptions,
  initialAdvancedFilter,
  initialSort,
  initialTaskId,
}: {
  tasks: Task[]
  tagOptions: string[]
  initialAdvancedFilter: AdvancedFilter
  initialSort: SortConfig
  initialTaskId?: string | null
}) {
  // E2E 用にハイドレーション完了を <html data-hydrated="1"> でマーキングする
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1"
  }, [])

  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>(initialAdvancedFilter)
  const [sort, setSort] = useState<SortConfig>(initialSort)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [searchQuery, setSearchQuery] = useState("")
  const advancedActive = isAdvancedFilterActive(advancedFilter)
  const sortActive = isSortActive(sort)

  const [isPending, startTransition] = useTransition()
  const [completingBar, setCompletingBar] = useState(false)
  const prevIsPendingRef = useRef(isPending)
  useEffect(() => {
    if (prevIsPendingRef.current && !isPending) {
      setCompletingBar(true)
      const timer = setTimeout(() => setCompletingBar(false), 400)
      return () => clearTimeout(timer)
    }
    prevIsPendingRef.current = isPending
  }, [isPending])

  // 選択中タスクは現在の tasks から検索
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null

  // ─── Refresh on visibility change ─────────────────────────────────────────
  // updateTag だけではサーバーキャッシュを無効化するのみで RSC 再描画はトリガ
  // されないことがあるため、router.refresh() で明示的にツリーを再取得する。
  const router = useRouter()
  const isPendingRef = useRef(false)
  useEffect(() => { isPendingRef.current = isPending }, [isPending])
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return
      if (isPendingRef.current) return
      startTransition(async () => {
        await refreshTasksAction()
        router.refresh()
      })
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [router])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ローディングバー */}
      <div
        className={`h-0.5 loading-bar-shimmer transition-all duration-300 ${isPending || completingBar ? "opacity-100" : "opacity-0"}`}
        style={{
          width: completingBar ? "100%" : isPending ? "80%" : "0%",
          boxShadow: "0 0 6px var(--accent)",
        }}
      />

      {/* Toolbar */}
      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 pt-3 pb-3 flex-shrink-0 flex items-center gap-2">
        <input
          data-testid="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索..."
          aria-label="タスクを検索"
          className="flex-1 min-w-0 rounded-lg px-4 py-2 text-sm bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-faint)] border border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)]"
          style={{ transition: "border-color 0.2s" }}
        />
        <button
          data-testid="filter-button"
          aria-label="フィルタを開く"
          onClick={() => setFilterSheetOpen(true)}
          className="relative flex-shrink-0 w-9 h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {advancedActive && (
            <span
              data-testid="filter-active-dot"
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 4px rgba(220,20,60,0.6)" }}
            />
          )}
        </button>
        <button
          data-testid="sort-button"
          aria-label="並び替えを開く"
          onClick={() => setSortSheetOpen(true)}
          className="relative flex-shrink-0 w-9 h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M6 12h12" />
            <path d="M10 18h4" />
          </svg>
          {sortActive && (
            <span
              data-testid="sort-active-dot"
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 4px rgba(220,20,60,0.6)" }}
            />
          )}
        </button>
        <button
          data-testid="refresh-button"
          disabled={isPending}
          onClick={() => startTransition(async () => { await refreshTasksAction(); router.refresh() })}
          className="flex-shrink-0 w-9 h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 disabled:opacity-40 transition-colors"
          aria-label="再読み込み"
        >
          <svg
            className={isPending ? "animate-spin-cyber" : ""}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>

      {/* Board */}
      <main data-testid="task-list-main" className="flex-1 overflow-hidden">
        <TaskBoard
          tasks={tasks}
          searchQuery={searchQuery}
          advancedFilter={advancedFilter}
          sort={sort}
          onSelect={setSelectedTaskId}
        />
      </main>

      <TaskCreate tagOptions={tagOptions} />
      {selectedTask && (
        <TaskDetail task={selectedTask} tagOptions={tagOptions} onClose={() => setSelectedTaskId(null)} />
      )}
      <TaskFilterSheet
        open={filterSheetOpen}
        filter={advancedFilter}
        tagOptions={tagOptions}
        onApply={(next) => {
          setAdvancedFilter(next)
          startTransition(async () => { await setAdvancedFilterAction(next) })
        }}
        onClose={() => setFilterSheetOpen(false)}
      />
      <TaskSortSheet
        open={sortSheetOpen}
        sort={sort}
        onApply={(next) => {
          setSort(next)
          startTransition(async () => { await setSortAction(next) })
        }}
        onClose={() => setSortSheetOpen(false)}
      />
    </div>
  )
}
