"use client"

import { useState, useTransition } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskCreate } from "./TaskCreate"
import { setFilterAction } from "@/app/actions"

const FILTERS: { label: string; key: string; statuses: TaskStatus[] | null }[] = [
  { label: "進行中・未着手", key: "active", statuses: ["進行中", "未着手"] },
  { label: "未着手",         key: "todo",   statuses: ["未着手"] },
  { label: "進行中",         key: "doing",  statuses: ["進行中"] },
  { label: "確認中",         key: "review", statuses: ["確認中"] },
  { label: "一時中断",       key: "paused", statuses: ["一時中断"] },
  { label: "すべて",         key: "all",    statuses: null },
]

export function TaskManager({ tasks, currentFilter }: { tasks: Task[]; currentFilter: string }) {
  const [isPending, startTransition] = useTransition()
  const [filterKey, setFilterKey] = useState(currentFilter)

  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const filtered = current.statuses
    ? tasks.filter((t) => t.status && current.statuses!.includes(t.status))
    : tasks

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ローディングバー */}
      <div className={`h-0.5 bg-blue-500 transition-all duration-300 ${isPending ? "opacity-100" : "opacity-0"}`}
        style={{ width: isPending ? "80%" : "0%" }} />

      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5 flex-shrink-0">
        <select
          value={filterKey}
          onChange={(e) => {
            const next = e.target.value
            setFilterKey(next)
            startTransition(async () => { await setFilterAction(next) })
          }}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-20">タスクがありません</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-gray-300 dark:text-gray-700 py-4 pb-24">{filtered.length}件</p>
        </div>
      </main>

      <TaskCreate />
    </div>
  )
}
