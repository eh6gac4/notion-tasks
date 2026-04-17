"use client"

import { useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { TaskItem } from "./TaskItem"

const FILTER_OPTIONS: { label: string; statuses: TaskStatus[] | "all" }[] = [
  { label: "進行中・未着手", statuses: ["進行中", "未着手"] },
  { label: "未着手", statuses: ["未着手"] },
  { label: "進行中", statuses: ["進行中"] },
  { label: "確認中", statuses: ["確認中"] },
  { label: "一時中断", statuses: ["一時中断"] },
  { label: "すべて", statuses: "all" },
]

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [activeFilter, setActiveFilter] = useState(0)

  const filtered = FILTER_OPTIONS[activeFilter].statuses === "all"
    ? tasks
    : tasks.filter((t) =>
        t.status !== null &&
        (FILTER_OPTIONS[activeFilter].statuses as TaskStatus[]).includes(t.status)
      )

  return (
    <div>
      <div className="flex gap-1 p-3 border-b border-gray-200 overflow-x-auto">
        {FILTER_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => setActiveFilter(i)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === i
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">タスクがありません</p>
      ) : (
        <ul>
          {filtered.map((task) => (
            <li key={task.id}>
              <TaskItem task={task} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-gray-300 py-3">{filtered.length}件</p>
    </div>
  )
}
