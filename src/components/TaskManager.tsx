"use client"

import { useRef } from "react"
import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskCreate } from "./TaskCreate"

const FILTERS = [
  { label: "進行中・未着手", key: "active" },
  { label: "未着手",         key: "todo" },
  { label: "進行中",         key: "doing" },
  { label: "確認中",         key: "review" },
  { label: "一時中断",       key: "paused" },
  { label: "すべて",         key: "all" },
]

export function TaskManager({ tasks }: { tasks: Task[] }) {
  const listRef = useRef<HTMLUListElement>(null)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter — DOM直接操作でReact状態不要 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0">
        <select
          defaultValue="active"
          onChange={(e) => {
            if (listRef.current) {
              listRef.current.dataset.filter = e.target.value
            }
          }}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Task list */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-20">タスクがありません</p>
          ) : (
            <ul
              ref={listRef}
              data-filter="active"
              className="task-list divide-y divide-gray-100"
            >
              {tasks.map((task) => (
                <li key={task.id} data-status={task.status ?? ""}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <TaskCreate />
    </div>
  )
}
