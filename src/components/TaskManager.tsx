"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import type { AdvancedFilter, SortConfig, Task } from "@/types/task"
import { TaskBoard } from "./TaskBoard"
import { TaskDetail } from "./TaskDetail"
import { TaskCreate } from "./TaskCreate"
import { TaskFilterSheet } from "./TaskFilterSheet"
import { TaskSortSheet } from "./TaskSortSheet"
import { setAdvancedFilterAction, setSortAction, refreshTasksAction, fetchInitialDataAction } from "@/app/actions"
import { isAdvancedFilterActive } from "@/constants/filters"
import { isSortActive } from "@/lib/task-sort"
import { TasksRefreshProvider } from "./TasksRefreshContext"

export function TaskManager({
  tasks: seedTasks,
  tagOptions: seedTagOptions,
  locationOptions: seedLocationOptions,
  initialAdvancedFilter,
  initialSort,
  initialTaskId,
}: {
  tasks?: Task[]
  tagOptions?: string[]
  locationOptions?: string[]
  initialAdvancedFilter: AdvancedFilter
  initialSort: SortConfig
  initialTaskId?: string | null
}) {
  const [tasks, setTasks] = useState<Task[]>(seedTasks ?? [])
  const [tagOptions, setTagOptions] = useState<string[]>(seedTagOptions ?? [])
  const [locationOptions, setLocationOptions] = useState<string[]>(seedLocationOptions ?? [])
  const isSeeded = seedTasks !== undefined

  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>(initialAdvancedFilter)
  const [sort, setSort] = useState<SortConfig>(initialSort)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  // 完了/中止は BoardColumn 内で lazy fetch されるため、親 tasks に存在しない。
  // 選択時に Task オブジェクトを直接受け取って fallback として保持する。
  const [externalSelectedTask, setExternalSelectedTask] = useState<Task | null>(null)
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

  // 選択中タスクはまず現在の tasks から検索 (refresh 後の最新を反映するため)、
  // 見つからなければ externalSelectedTask (lazy load 経由で渡された Task) を使う。
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ??
      (externalSelectedTask?.id === selectedTaskId ? externalSelectedTask : null)
    : null

  function handleSelect(task: Task) {
    setSelectedTaskId(task.id)
    setExternalSelectedTask(task)
  }

  function handleCloseDetail() {
    setSelectedTaskId(null)
    setExternalSelectedTask(null)
  }

  // 初回ロード: 画面 (header / toolbar / board の枠) を即時表示してからデータを取得する。
  // 親から tasks が seed されている場合 (テスト等) は fetch をスキップする。
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1"
    if (isSeeded) return
    startTransition(async () => {
      const data = await fetchInitialDataAction()
      setTasks(data.tasks)
      setTagOptions(data.tagOptions)
      setLocationOptions(data.locationOptions)
    })
  }, [isSeeded])

  // ─── Refresh on visibility change ─────────────────────────────────────────
  // タブ復帰時はキャッシュを無効化してから再取得する。
  const isPendingRef = useRef(false)
  useEffect(() => { isPendingRef.current = isPending }, [isPending])
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return
      if (isPendingRef.current) return
      startTransition(async () => {
        await refreshTasksAction()
        const data = await fetchInitialDataAction()
        setTasks(data.tasks)
        setTagOptions(data.tagOptions)
        setLocationOptions(data.locationOptions)
      })
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  // 手動リフレッシュ + 子コンポーネント (TaskCreate / TaskItem / TaskDetail) からの
  // ミューテーション後リフレッシュで共通利用。サーバーキャッシュを無効化してから再取得する。
  // useCallback で参照を安定化させ、TasksRefreshProvider の value を介した
  // TaskItem の React.memo を破らないようにする。
  const refresh = useCallback(() => {
    startTransition(async () => {
      await refreshTasksAction()
      const data = await fetchInitialDataAction()
      setTasks(data.tasks)
      setTagOptions(data.tagOptions)
      setLocationOptions(data.locationOptions)
    })
  }, [])

  return (
    <TasksRefreshProvider value={refresh}>
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ローディングバー (h-0.5 = 2px は装飾的細線として 4px 例外を適用 — globals.css 参照) */}
      <div
        className={`h-0.5 loading-bar-shimmer transition-all duration-300 ${isPending || completingBar ? "opacity-100" : "opacity-0"}`}
        style={{
          width: completingBar ? "100%" : isPending ? "80%" : "0%",
          boxShadow: "0 0 6px var(--accent)",
        }}
      />

      {/* Toolbar */}
      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 lg:px-6 py-3 flex-shrink-0 flex items-center gap-3">
        <input
          data-testid="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索..."
          aria-label="タスクを検索"
          className="field flex-1 min-w-0 lg:max-w-md"
        />
        <button
          data-testid="filter-button"
          aria-label="フィルタを開く"
          onClick={() => setFilterSheetOpen(true)}
          className="icon-btn relative flex-shrink-0"
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
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 6px rgba(220,20,60,0.7)" }}
            />
          )}
        </button>
        <button
          data-testid="sort-button"
          aria-label="並び替えを開く"
          onClick={() => setSortSheetOpen(true)}
          className="icon-btn relative flex-shrink-0"
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
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 6px rgba(220,20,60,0.7)" }}
            />
          )}
        </button>
        <button
          data-testid="refresh-button"
          disabled={isPending}
          onClick={refresh}
          className="icon-btn flex-shrink-0"
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
          isLoading={isPending}
          onSelect={handleSelect}
        />
      </main>

      <TaskCreate tagOptions={tagOptions} locationOptions={locationOptions} />
      {selectedTask && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          tagOptions={tagOptions}
          locationOptions={locationOptions}
          allTasks={tasks}
          onSelectTask={handleSelect}
          onClose={handleCloseDetail}
        />
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
    </TasksRefreshProvider>
  )
}
