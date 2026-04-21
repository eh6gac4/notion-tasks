"use client"

import { useState, useTransition } from "react"
import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskCreate } from "./TaskCreate"
import { setFilterAction, refreshTasksAction } from "@/app/actions"
import { FILTERS } from "@/constants/filters"
import { sortByPriorityAndDue, groupAndSort } from "@/lib/task-sort"

export function TaskManager({ tasks, currentFilter }: { tasks: Task[]; currentFilter: string }) {
  const [isPending, startTransition] = useTransition()
  const [filterKey, setFilterKey] = useState(currentFilter)

  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const filtered = current.statuses
    ? tasks.filter((t) => t.status && current.statuses!.includes(t.status))
    : tasks

  const isGrouped = !current.statuses || current.statuses.length > 1
  const groups = isGrouped ? groupAndSort(filtered) : null
  const sortedFlat = !isGrouped ? sortByPriorityAndDue(filtered) : null

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

      <div className="bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)] px-4 py-2.5 flex-shrink-0 flex gap-2">
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
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
                      <li key={task.id}><TaskItem task={task} /></li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          ) : (
            <ul className="divide-y divide-[rgba(255,0,204,0.1)]">
              {sortedFlat!.map((task) => (
                <li key={task.id}><TaskItem task={task} /></li>
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
    </div>
  )
}
