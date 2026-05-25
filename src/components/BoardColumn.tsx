"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AdvancedFilter, SortConfig, Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { applyAdvancedFilter } from "@/constants/filters"
import { applySort } from "@/lib/task-sort"
import { buildNestedOrder, filterCollapsed } from "@/lib/task-tree"
import { STATUS_ACCENT } from "@/constants/styles"
import { getCompletedTasksAction, getCancelledTasksAction, getBacklogTasksAction } from "@/app/actions"
import { CyberLoader } from "./CyberLoader"

// 列が viewport に入ってから fetch する重い (or 低頻度な) ステータス。
// 完了/中止 は件数が多く、バックログ は「退避してたまに見る」想定なので初回ロードから外す。
const LAZY_STATUSES: ReadonlySet<TaskStatus> = new Set(["完了", "中止", "バックログ"])

// 注: action 参照は遅延 (関数呼び出し時) に解決する。module-load 時に LAZY_STATUSES の
// バリュー側で dereference すると、テストの vi.mock("@/app/actions", ...) が
// すべての action を列挙していない場合に import が失敗する。
function getLazyFetcher(status: TaskStatus): (() => Promise<Task[]>) | null {
  switch (status) {
    case "完了":     return getCompletedTasksAction
    case "中止":     return getCancelledTasksAction
    case "バックログ": return getBacklogTasksAction
    default:         return null
  }
}

// 完了/中止カラムは件数が膨らみがち。全件を一気に DOM 投入すると React の
// reconciliation と paint が重くなりスクロール jank の原因になるため、
// クライアント側で chunk render する (初期 INCREMENTAL_INITIAL 件、リスト末尾
// 付近で +INCREMENTAL_STEP 件ずつ追加)。データ自体はメモリに全件あるので
// 検索/フィルタ/ソートはこれまで通りすべてに掛かる。
const INCREMENTAL_INITIAL = 50
const INCREMENTAL_STEP = 50

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
  onSelect: (task: Task) => void
}) {
  // 完了/中止/バックログ カラムは初回ページ取得から除外しているため、カラムが viewport に
  // 入ったタイミングで一度だけ fetch する (ページ初期化を軽くする目的)。
  // ただし tasks prop が既に該当ステータスのタスクを含む場合
  // (= テスト/明示的 fetch 済み) はそれをそのまま使い、lazy load はスキップする。
  const lazyStatus: TaskStatus | null =
    statuses.length === 1 && LAZY_STATUSES.has(statuses[0]) ? statuses[0] : null
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
    const fetcher = getLazyFetcher(lazyStatus)
    if (!fetcher) return
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

  // サブタスクを親タスクの直下にインデント表示するため、列を木構造順に並べ替える。
  // 親が同じ列に居なければ子はルートとして残るので、一覧から消えることはない。
  const nested = useMemo(() => buildNestedOrder(filtered), [filtered])

  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set())

  const handleToggleCollapse = useCallback((taskId: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }, [])

  // 同カラム内に直接の子を持つ親 ID のセット（トグルボタン表示判定用）
  const parentIdsWithChildren = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < nested.length - 1; i++) {
      if (nested[i + 1].depth > nested[i].depth) set.add(nested[i].task.id)
    }
    return set
  }, [nested])

  const nestedFiltered = useMemo(
    () => (collapsedParents.size === 0 ? nested : filterCollapsed(nested, collapsedParents)),
    [nested, collapsedParents]
  )

  const accent = STATUS_ACCENT[accentStatus]
  const isLazyPending = isLazyStatus && !propsHasLazy && lazyTasks === null
  const showLazyLoading = isLazyPending && !hasLoadError
  const showLazyError = isLazyPending && hasLoadError

  // incremental render (lazyStatus のみ): 表示件数を chunk ずつ増やす
  const [displayCount, setDisplayCount] = useState(INCREMENTAL_INITIAL)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLLIElement>(null)

  // filtered (検索/フィルタ/ソートで参照が変わる) のたびに先頭からやり直す
  useEffect(() => {
    if (!isLazyStatus) return
    setDisplayCount(INCREMENTAL_INITIAL)
  }, [isLazyStatus, nestedFiltered])

  const visible = isLazyStatus ? nestedFiltered.slice(0, displayCount) : nestedFiltered
  const hasMore = isLazyStatus && displayCount < nestedFiltered.length

  // 末尾 sentinel が見えたら次の chunk をロード。スクロール親 (overflow-y-auto) を
  // root にする。rootMargin: 200px で下端到達前に先読みして体感を滑らかに。
  useEffect(() => {
    if (!hasMore) return
    const sentinel = sentinelRef.current
    const root = scrollContainerRef.current
    if (!sentinel || !root) return
    if (typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setDisplayCount((c) => Math.min(c + INCREMENTAL_STEP, filtered.length))
      },
      { root, rootMargin: "200px", threshold: 0 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, filtered.length])

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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-11">
        {showLazyLoading ? (
          <div
            data-testid="board-column-loader"
            className="flex justify-center py-8"
          >
            <CyberLoader />
          </div>
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
            {visible.map(({ task, depth }) => (
              <li
                key={task.id}
                data-subtask-depth={depth}
                // content-visibility: auto は viewport 外要素の paint/layout を skip して
                // 大量カード時のスクロール jank を抑える。ただし off-screen 要素の innerText が
                // 取れなくなる副作用があり、e2e flaky を生んだため、lazy load 系カラム
                // (完了/中止/バックログ) のみに限定する (lazyStatus でガード)。
                style={
                  isLazyStatus
                    ? { contentVisibility: "auto", containIntrinsicSize: "auto 88px" }
                    : undefined
                }
              >
                {depth > 0 ? (
                  // サブタスク: 親の下に 16px インデント + 左ガイド線で階層を示す
                  // (16px / pl-3=12px は 4px グリッド準拠)。
                  <div
                    className="border-l border-[var(--border-strong)] pl-3"
                    style={{ marginLeft: depth * 16 }}
                  >
                    <TaskItem
                      task={task}
                      onSelect={onSelect}
                      isCollapsible={parentIdsWithChildren.has(task.id)}
                      isCollapsed={collapsedParents.has(task.id)}
                      onToggleCollapse={handleToggleCollapse}
                    />
                  </div>
                ) : (
                  <TaskItem
                    task={task}
                    onSelect={onSelect}
                    isCollapsible={parentIdsWithChildren.has(task.id)}
                    isCollapsed={collapsedParents.has(task.id)}
                    onToggleCollapse={handleToggleCollapse}
                  />
                )}
              </li>
            ))}
            {hasMore && (
              <li ref={sentinelRef} aria-hidden="true" className="h-1" />
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
