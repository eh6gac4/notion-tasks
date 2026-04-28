"use client"

import { useState, useTransition, useEffect, useRef, useMemo } from "react"
import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskDetail } from "./TaskDetail"
import { TaskCreate } from "./TaskCreate"
import { setFilterAction, refreshTasksAction, fetchTasksByFilterAction } from "@/app/actions"
import { FILTERS } from "@/constants/filters"
import { sortByPriorityAndDue, groupAndSort } from "@/lib/task-sort"

// ─── TaskListPanel ─────────────────────────────────────────────────────────────

function TaskSkeleton() {
  return (
    <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="px-4 py-4">
          <div
            className="h-4 bg-[#1e002e] rounded animate-pulse mb-3"
            style={{ width: `${60 + (i % 3) * 13}%` }}
          />
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-[#160022] rounded-full animate-pulse" />
            <div className="h-5 w-10 bg-[#160022] rounded-full animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function TaskListPanel({
  filterKey,
  tasks,
  searchQuery,
  onSelect,
}: {
  filterKey: string
  tasks: Task[] | undefined
  searchQuery: string
  onSelect: (id: string) => void
}) {
  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const q = searchQuery.trim().toLowerCase()

  const filtered = useMemo(() => {
    const byStatus = current.statuses
      ? (tasks ?? []).filter((t) => t.status && current.statuses!.includes(t.status))
      : (tasks ?? [])
    return q === "" ? byStatus : byStatus.filter((t) => t.title.toLowerCase().includes(q))
  }, [tasks, current.statuses, q])

  const isGrouped = !current.statuses || current.statuses.length > 1
  const groups = isGrouped ? groupAndSort(filtered) : null
  const sortedFlat = !isGrouped ? sortByPriorityAndDue(filtered) : null

  if (tasks === undefined) return <TaskSkeleton />

  if (filtered.length === 0) {
    return (
      <p className="text-center text-[#553355] text-xs py-20 tracking-widest">
        {q !== "" ? "— NO MATCH —" : "— NO TASKS —"}
      </p>
    )
  }

  return (
    <>
      {isGrouped ? (
        groups!.map(({ status, tasks: groupTasks }) => (
          <section key={status}>
            <div className="px-4 py-2 flex items-center gap-2 border-b border-[rgba(255,0,204,0.15)] sticky top-0 bg-[#0d0014] z-10">
              <span className="text-[10px] tracking-[0.2em] text-[#aa66aa]">{status}</span>
              <span className="text-[10px] text-[#553355]">{groupTasks.length}</span>
            </div>
            <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
              {groupTasks.map((task) => (
                <li key={task.id}><TaskItem task={task} onSelect={onSelect} /></li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
          {sortedFlat!.map((task) => (
            <li key={task.id}><TaskItem task={task} onSelect={onSelect} /></li>
          ))}
        </ul>
      )}
      <p className="text-center text-xs text-[#553355] py-4 pb-24 tracking-widest">
        {filtered.length} TASKS
      </p>
    </>
  )
}

// ─── TaskManager ───────────────────────────────────────────────────────────────

const N = FILTERS.length

function getPanelKeys(idx: number) {
  return {
    left:   FILTERS[(idx - 1 + N) % N].key,
    center: FILTERS[idx].key,
    right:  FILTERS[(idx + 1) % N].key,
  }
}

export function TaskManager({
  tasks,
  tagOptions,
  currentFilter,
  initialTaskId,
}: {
  tasks: Task[]
  tagOptions: string[]
  currentFilter: string
  initialTaskId?: string | null
}) {
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

  const initialIndex = Math.max(0, FILTERS.findIndex((f) => f.key === currentFilter))
  const initialKey = FILTERS[initialIndex].key
  const [centerIndex, setCenterIndex] = useState(initialIndex)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [searchQuery, setSearchQuery] = useState("")

  // Task cache: filterKey → Task[]
  const [taskCache, setTaskCache] = useState<Map<string, Task[]>>(
    () => new Map([[initialKey, tasks]])
  )

  // When server delivers fresh tasks, sync to the matching filter key
  useEffect(() => {
    const key = FILTERS.find((f) => f.key === currentFilter)?.key ?? FILTERS[0].key
    setTaskCache((prev) => new Map(prev).set(key, tasks))
  }, [tasks, currentFilter])

  // Pre-fetch adjacent panels when centerIndex changes
  const taskCacheRef = useRef(taskCache)
  useEffect(() => { taskCacheRef.current = taskCache }, [taskCache])

  useEffect(() => {
    const { left, right } = getPanelKeys(centerIndex)
    for (const key of [left, right]) {
      if (!taskCacheRef.current.has(key)) {
        fetchTasksByFilterAction(key).then((data) => {
          setTaskCache((prev) => new Map(prev).set(key, data))
        })
      }
    }
  }, [centerIndex])

  // Selected task: search across all cached tasks
  const selectedTask = selectedTaskId
    ? [...taskCache.values()].flat().find((t) => t.id === selectedTaskId) ?? null
    : null

  // ─── Carousel refs ────────────────────────────────────────────────────────
  const mainRef = useRef<HTMLElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const isAnimatingRef = useRef(false)

  const centerIndexRef = useRef(centerIndex)
  const selectedTaskIdRef = useRef<string | null>(selectedTaskId)
  const isPendingRef = useRef(false)

  useEffect(() => { centerIndexRef.current = centerIndex }, [centerIndex])
  useEffect(() => { selectedTaskIdRef.current = selectedTaskId }, [selectedTaskId])
  useEffect(() => { isPendingRef.current = isPending }, [isPending])

  // ─── Swipe gesture ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const THRESHOLD = 60
    const LOCK_DIST = 8

    const touchStartXRef = { current: 0 }
    const touchStartYRef = { current: 0 }
    const directionRef = { current: null as "horiz" | "vert" | null }

    function onStart(e: TouchEvent) {
      if (e.touches.length > 1) { directionRef.current = "vert"; return }
      if (isAnimatingRef.current) return
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
      directionRef.current = null
    }

    function onMove(e: TouchEvent) {
      if (isAnimatingRef.current) return
      const dx = e.touches[0].clientX - touchStartXRef.current
      const dy = e.touches[0].clientY - touchStartYRef.current

      if (directionRef.current === null) {
        if (Math.hypot(dx, dy) < LOCK_DIST) return
        directionRef.current = Math.abs(dx) > Math.abs(dy) ? "horiz" : "vert"
      }
      if (directionRef.current !== "horiz") return

      e.preventDefault()

      cancelAnimationFrame(rafRef.current)
      const capture = dx
      rafRef.current = requestAnimationFrame(() => {
        if (wrapperRef.current) {
          wrapperRef.current.style.transition = "none"
          wrapperRef.current.style.transform = `translateX(calc(-33.333% + ${capture}px))`
        }
      })
    }

    function onEnd(e: TouchEvent) {
      cancelAnimationFrame(rafRef.current)
      if (directionRef.current !== "horiz") return
      if (selectedTaskIdRef.current !== null) return
      if (isPendingRef.current) return
      if (isAnimatingRef.current) return

      const dx = e.changedTouches[0].clientX - touchStartXRef.current

      if (Math.abs(dx) < THRESHOLD) {
        snapBack()
        return
      }

      const cur = centerIndexRef.current
      if (dx < 0) {
        commitSwipe((cur + 1) % N, "left")
      } else {
        commitSwipe((cur - 1 + N) % N, "right")
      }
    }

    function snapBack() {
      if (!wrapperRef.current) return
      wrapperRef.current.style.transition = "transform 200ms ease-out"
      wrapperRef.current.style.transform = "translateX(-33.333%)"
    }

    function commitSwipe(nextIndex: number, dir: "left" | "right") {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      isAnimatingRef.current = true

      const exitX = dir === "left" ? "-66.666%" : "0%"
      wrapper.style.transition = "transform 150ms ease-in"
      wrapper.style.transform = `translateX(${exitX})`

      setTimeout(() => {
        const nextKey = FILTERS[nextIndex].key
        setCenterIndex(nextIndex)
        startTransition(async () => { await setFilterAction(nextKey) })

        requestAnimationFrame(() => {
          if (!wrapperRef.current) return
          wrapperRef.current.style.transition = "none"
          wrapperRef.current.style.transform = "translateX(-33.333%)"
          setTimeout(() => { isAnimatingRef.current = false }, 50)
        })
      }, 150)
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    return () => {
      cancelAnimationFrame(rafRef.current)
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
    }
  }, [])

  const { left, center, right } = getPanelKeys(centerIndex)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ローディングバー */}
      <div
        className={`h-0.5 loading-bar-shimmer transition-all duration-300 ${isPending || completingBar ? "opacity-100" : "opacity-0"}`}
        style={{
          width: completingBar ? "100%" : isPending ? "80%" : "0%",
          boxShadow: "0 0 8px #ff00cc",
        }}
      />

      <div className="bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)] px-4 pt-3 pb-2 flex-shrink-0 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            data-testid="filter-select"
            value={FILTERS[centerIndex].key}
            onChange={(e) => {
              const next = e.target.value
              const idx = FILTERS.findIndex((f) => f.key === next)
              if (idx >= 0) {
                setCenterIndex(idx)
                startTransition(async () => { await setFilterAction(next) })
              }
            }}
            className="w-full rounded-xl px-4 py-3 text-sm bg-[#160022] text-[#ffbbee] border border-[rgba(255,0,204,0.3)] focus:outline-none focus:border-[#ff00cc]"
            style={{ transition: "border-color 0.2s" }}
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button
            data-testid="refresh-button"
            disabled={isPending}
            onClick={() => startTransition(async () => { await refreshTasksAction() })}
            className="flex-shrink-0 w-10 self-stretch rounded-xl border border-[rgba(255,0,204,0.3)] bg-[#160022] text-[#ff00cc] flex items-center justify-center hover:border-[#ff00cc] active:scale-95 disabled:opacity-40 transition-colors"
          >
            <svg
              className={isPending ? "animate-spin-cyber" : ""}
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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

        <input
          data-testid="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索..."
          aria-label="タスクを検索"
          className="w-full rounded-xl px-4 py-3 text-sm bg-[#160022] text-[#ffbbee] placeholder:text-[#553355] border border-[rgba(255,0,204,0.3)] focus:outline-none focus:border-[#ff00cc]"
          style={{ transition: "border-color 0.2s" }}
        />

        {/* ページネーションドット */}
        <div className="flex justify-center items-center gap-2">
          {FILTERS.map((f, i) => {
            const active = i === centerIndex
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                aria-label={f.label}
                onClick={() => {
                  if (isAnimatingRef.current) return
                  setCenterIndex(i)
                  startTransition(async () => { await setFilterAction(f.key) })
                }}
                className={active ? "animate-dot-pulse" : ""}
                style={{
                  transition: active
                    ? "width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms ease"
                    : "width 250ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms ease, box-shadow 250ms ease",
                  width: active ? "20px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: active ? "#ff00cc" : "rgba(153,102,136,0.4)",
                  boxShadow: active ? undefined : "none",
                }}
              />
            )
          })}
        </div>
      </div>

      <main
        ref={mainRef}
        data-testid="task-list-main"
        className="flex-1 overflow-hidden"
      >
        <div
          ref={wrapperRef}
          className="flex h-full"
          style={{ width: "300%", transform: "translateX(-33.333%)", willChange: "transform" }}
        >
          {/* 左パネル（前フィルター） */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto" }}>
            <div className="max-w-2xl mx-auto">
              <TaskListPanel filterKey={left} tasks={taskCache.get(left)} searchQuery={searchQuery} onSelect={setSelectedTaskId} />
            </div>
          </div>

          {/* 中央パネル（現在フィルター） */}
          <div data-testid="panel-center" style={{ width: "33.333%", height: "100%", overflowY: "auto" }}>
            <div className="max-w-2xl mx-auto">
              <TaskListPanel filterKey={center} tasks={taskCache.get(center)} searchQuery={searchQuery} onSelect={setSelectedTaskId} />
            </div>
          </div>

          {/* 右パネル（次フィルター） */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto" }}>
            <div className="max-w-2xl mx-auto">
              <TaskListPanel filterKey={right} tasks={taskCache.get(right)} searchQuery={searchQuery} onSelect={setSelectedTaskId} />
            </div>
          </div>
        </div>
      </main>

      <TaskCreate tagOptions={tagOptions} />
      {selectedTask && (
        <TaskDetail task={selectedTask} tagOptions={tagOptions} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}
