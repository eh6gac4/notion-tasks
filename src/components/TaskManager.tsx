"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskDetail } from "./TaskDetail"
import { TaskCreate } from "./TaskCreate"
import { setFilterAction, refreshTasksAction } from "@/app/actions"
import { FILTERS } from "@/constants/filters"
import { sortByPriorityAndDue, groupAndSort } from "@/lib/task-sort"

export function TaskManager({ tasks, currentFilter, initialTaskId }: { tasks: Task[]; currentFilter: string; initialTaskId?: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [filterKey, setFilterKey] = useState(currentFilter)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const filtered = current.statuses
    ? tasks.filter((t) => t.status && current.statuses!.includes(t.status))
    : tasks

  const isGrouped = !current.statuses || current.statuses.length > 1
  const groups = isGrouped ? groupAndSort(filtered) : null
  const sortedFlat = !isGrouped ? sortByPriorityAndDue(filtered) : null

  // ─── Carousel refs ────────────────────────────────────────────────────────
  const mainRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const isAnimatingRef = useRef(false)

  // stale closure 対策
  const filterKeyRef = useRef(filterKey)
  const selectedTaskIdRef = useRef<string | null>(selectedTaskId)
  const isPendingRef = useRef(false)

  useEffect(() => { filterKeyRef.current = filterKey }, [filterKey])
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
        if (contentRef.current) {
          contentRef.current.style.transition = "none"
          contentRef.current.style.transform = `translateX(${capture}px)`
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

      const idx = FILTERS.findIndex((f) => f.key === filterKeyRef.current)
      const cur = idx < 0 ? 0 : idx
      const nextFilter = dx < 0
        ? FILTERS[(cur + 1) % FILTERS.length]
        : FILTERS[(cur - 1 + FILTERS.length) % FILTERS.length]
      const exitX = dx < 0 ? -window.innerWidth : window.innerWidth
      const entryX = -exitX

      commitSwipe(nextFilter.key, exitX, entryX)
    }

    function snapBack() {
      if (!contentRef.current) return
      contentRef.current.style.transition = "transform 200ms ease-out"
      contentRef.current.style.transform = "translateX(0)"
    }

    function commitSwipe(nextKey: string, exitX: number, entryX: number) {
      const content = contentRef.current
      if (!content) return
      isAnimatingRef.current = true

      content.style.transition = "transform 150ms ease-in"
      content.style.transform = `translateX(${exitX}px)`

      setTimeout(() => {
        setFilterKey(nextKey)
        startTransition(async () => { await setFilterAction(nextKey) })

        requestAnimationFrame(() => {
          if (!contentRef.current) return
          contentRef.current.style.transition = "none"
          contentRef.current.style.transform = `translateX(${entryX}px)`
          requestAnimationFrame(() => {
            if (!contentRef.current) return
            contentRef.current.style.transition = "transform 150ms ease-out"
            contentRef.current.style.transform = "translateX(0)"
            setTimeout(() => { isAnimatingRef.current = false }, 150)
          })
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ローディングバー */}
      <div
        className={`h-0.5 transition-all duration-300 ${isPending ? "opacity-100" : "opacity-0"}`}
        style={{
          width: isPending ? "80%" : "0%",
          backgroundColor: "#ff00cc",
          boxShadow: "0 0 8px #ff00cc",
        }}
      />

      <div className="bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)] px-4 pt-2.5 pb-2 flex-shrink-0 flex flex-col gap-1.5">
        <div className="flex gap-2">
          <select
            data-testid="filter-select"
            value={filterKey}
            onChange={(e) => {
              const next = e.target.value
              setFilterKey(next)
              startTransition(async () => { await setFilterAction(next) })
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
            className="flex-shrink-0 w-10 self-stretch rounded-xl border border-[rgba(255,0,204,0.3)] bg-[#160022] text-[#ff00cc] flex items-center justify-center hover:border-[#ff00cc] disabled:opacity-40 transition-colors"
          >
            <svg
              className={isPending ? "animate-spin" : ""}
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

        {/* ページネーションドット */}
        <div className="flex justify-center items-center gap-1.5 pb-0.5">
          {FILTERS.map((f) => {
            const active = f.key === filterKey
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                aria-label={f.label}
                onClick={() => {
                  if (isAnimatingRef.current) return
                  setFilterKey(f.key)
                  startTransition(async () => { await setFilterAction(f.key) })
                }}
                className="transition-all duration-200"
                style={{
                  width: active ? "20px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: active ? "#ff00cc" : "rgba(153,102,136,0.4)",
                  boxShadow: active ? "0 0 6px rgba(255,0,204,0.7)" : "none",
                }}
              />
            )
          })}
        </div>
      </div>

      <main
        ref={mainRef}
        data-testid="task-list-main"
        className="flex-1 overflow-y-auto"
        style={{ overflowX: "hidden" }}
      >
        <div ref={contentRef} className="max-w-2xl mx-auto" style={{ willChange: "transform" }}>
          {isPending ? (
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
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#553355] text-xs py-20 tracking-widest">
              — NO TASKS —
            </p>
          ) : isGrouped ? (
            <>
              {groups!.map(({ status, tasks: groupTasks }) => (
                <section key={status}>
                  <div className="px-4 py-1.5 flex items-center gap-2 border-b border-[rgba(255,0,204,0.15)] sticky top-0 bg-[#0d0014] z-10">
                    <span className="text-[10px] tracking-[0.2em] text-[#aa66aa]">{status}</span>
                    <span className="text-[10px] text-[#553355]">{groupTasks.length}</span>
                  </div>
                  <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
                    {groupTasks.map((task) => (
                      <li key={task.id}><TaskItem task={task} onSelect={setSelectedTaskId} /></li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          ) : (
            <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
              {sortedFlat!.map((task) => (
                <li key={task.id}><TaskItem task={task} onSelect={setSelectedTaskId} /></li>
              ))}
            </ul>
          )}
          {!isPending && (
            <p className="text-center text-xs text-[#553355] py-4 pb-24 tracking-widest">
              {filtered.length} TASKS
            </p>
          )}
        </div>
      </main>

      <TaskCreate />
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}
