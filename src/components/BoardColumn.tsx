"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { applyAdvancedFilter } from "@/constants/filters"
import { applySort } from "@/lib/task-sort"
import { STATUS_ACCENT } from "@/constants/styles"
import { getCompletedTasksAction, getCancelledTasksAction } from "@/app/actions"

export function BoardColumn({
  columnKey,
  title,
  statuses,
  accentStatus,
  tasks,
  searchQuery,
  advancedFilter,
  sort,
  onSelect,
}: {
  columnKey: string
  title: string
  statuses: TaskStatus[]
  accentStatus: TaskStatus
  tasks: Task[]
  searchQuery: string
  advancedFilter: AdvancedFilter
  sort: SortConfig
  onSelect: (id: string) => void
}) {
  // 完了/中止カラムは初回ページ取得から除外しているため、カラムが viewport に
  // 入ったタイミングで一度だけ fetch する (ページ初期化を軽くする目的)。
  // ただし tasks prop が既に該当ステータスのタスクを含む場合
  // (= テスト/明示的 fetch 済み) はそれをそのまま使い、lazy load はスキップする。
  const lazyStatus: TaskStatus | null =
    statuses.length === 1 && (statuses[0] === "完了" || statuses[0] === "中止") ? statuses[0] : null
  const isLazyStatus = lazyStatus !== null
  const propLazyTasks = useMemo(
    () => (isLazyStatus ? tasks.filter((t) => t.status === lazyStatus) : []),
    [isLazyStatus, lazyStatus, tasks]
  )
  const propsHasLazy = propLazyTasks.length > 0
  const [lazyTasks, setLazyTasks] = useState<Task[] | null>(null)
  const [isLoadingLazy, setIsLoadingLazy] = useState(false)
  const [hasLoadError, setHasLoadError] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isLazyStatus) return
    if (propsHasLazy) return
    if (lazyTasks !== null) return
    const el = sectionRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") return
    const fetcher = lazyStatus === "完了" ? getCompletedTasksAction : getCancelledTasksAction
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      obs.disconnect()
      setIsLoadingLazy(true)
      fetcher()
        .then((t) => setLazyTasks(t))
        .catch(() => setHasLoadError(true))
        .finally(() => setIsLoadingLazy(false))
    }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [isLazyStatus, propsHasLazy, lazyTasks, lazyStatus])

  // タブ復帰時に lazy state をクリアして、再びカラムが見えたら fetch しなおす。
  // (TaskManager 側の router.refresh() ではローカル state は消えないので個別に対応)
  useEffect(() => {
    if (!isLazyStatus) return
    function onVisible() {
      if (document.visibilityState !== "visible") return
      setLazyTasks(null)
      setHasLoadError(false)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [isLazyStatus])

  const q = searchQuery.trim().toLowerCase()
  const filtered = useMemo(() => {
    let source: Task[]
    if (isLazyStatus) {
      source = propsHasLazy ? propLazyTasks : (lazyTasks ?? [])
    } else {
      source = tasks.filter((t) => t.status !== null && statuses.includes(t.status))
    }
    const byAdvanced = applyAdvancedFilter(source, advancedFilter)
    const bySearch = q === "" ? byAdvanced : byAdvanced.filter((t) => t.title.toLowerCase().includes(q))
    const sorted = applySort(bySearch, sort)
    // 複数 status を束ねるカラムでは status の並び (statuses 配列の順) で
    // グルーピング再ソートする。Array.sort は安定なので、各グループ内では
    // applySort の結果を維持する。
    if (statuses.length <= 1) return sorted
    return [...sorted].sort((a, b) => {
      const ai = a.status ? statuses.indexOf(a.status) : statuses.length
      const bi = b.status ? statuses.indexOf(b.status) : statuses.length
      return ai - bi
    })
  }, [isLazyStatus, propsHasLazy, propLazyTasks, lazyTasks, tasks, statuses, advancedFilter, q, sort])

  const accent = STATUS_ACCENT[accentStatus]
  const isLazyPending = isLazyStatus && !propsHasLazy && lazyTasks === null
  const showLazyLoading = isLazyPending && !hasLoadError
  const showLazyError = isLazyPending && hasLoadError

  return (
    <section
      ref={sectionRef}
      data-testid="board-column"
      data-column-key={columnKey}
      data-status={statuses.join(",")}
      className="flex-shrink-0 w-[360px] h-full flex flex-col snap-start"
      style={{ scrollSnapAlign: "start" }}
    >
      <header
        className="sticky top-0 z-10 px-4 py-3 bg-[var(--bg)] border-b border-[var(--border)] flex items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
        />
        <span className="font-pixel text-xs tracking-widest uppercase flex-1" style={{ color: accent }}>
          {title}
        </span>
        <span className="font-pixel text-[11px] text-[var(--text-dim)] tabular-nums bg-[var(--surface-2)] rounded px-2 py-1">
          {isLazyPending ? "" : filtered.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
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
