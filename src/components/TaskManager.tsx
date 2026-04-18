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
  const [, startTransition] = useTransition()
  const [filterKey, setFilterKey] = useState(currentFilter)

  const current = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const filtered = current.statuses
    ? tasks.filter((t) => t.status && current.statuses!.includes(t.status))
    : tasks

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* フィルター: mainの外、stickyなし */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0">
        <select
          value={filterKey}
          onChange={(e) => {
            const next = e.target.value
            setFilterKey(next)  // 即時反映（startTransition外）
            startTransition(async () => {
              await setFilterAction(next)
            })
          }}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* タスクリスト: ここだけスクロール */}
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
    </div>
  )
}
