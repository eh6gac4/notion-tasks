"use client"

import { useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskCreate } from "./TaskCreate"

const FILTERS: { label: string; key: string; statuses: TaskStatus[] | null }[] = [
  { label: "進行中・未着手", key: "active", statuses: ["進行中", "未着手"] },
  { label: "未着手",         key: "todo",   statuses: ["未着手"] },
  { label: "進行中",         key: "doing",  statuses: ["進行中"] },
  { label: "確認中",         key: "review", statuses: ["確認中"] },
  { label: "一時中断",       key: "paused", statuses: ["一時中断"] },
  { label: "すべて",         key: "all",    statuses: null },
]

export function TaskManager({ tasks }: { tasks: Task[] }) {
  const [filterKey, setFilterKey] = useState("active")
  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]

  const filtered = current.statuses
    ? tasks.filter((t) => t.status && current.statuses!.includes(t.status))
    : tasks

  return (
    <>
      {/* Filter */}
      <div className="sticky top-14 z-10 bg-white border-b border-gray-100">
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterKey(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                f.key === filterKey
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-20">タスクがありません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-gray-300 py-4 pb-24">{filtered.length}件</p>
        </div>
      </main>

      <TaskCreate />
    </>
  )
}
