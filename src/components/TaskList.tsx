"use client"

import { useState } from "react"
import Link from "next/link"
import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskForm } from "./TaskForm"

const FILTER_OPTIONS = [
  { label: "進行中・未着手", key: "active" },
  { label: "未着手",         key: "todo" },
  { label: "進行中",         key: "doing" },
  { label: "確認中",         key: "review" },
  { label: "一時中断",       key: "paused" },
  { label: "すべて",         key: "all" },
]

export function TaskList({ tasks, currentFilter }: { tasks: Task[]; currentFilter: string }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
        <div className="flex gap-1.5 overflow-x-auto flex-1 pb-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={`/?filter=${opt.key}`}
              scroll={false}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                currentFilter === opt.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex-shrink-0 bg-blue-600 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl leading-none hover:bg-blue-700 transition-colors"
          aria-label="タスクを追加"
        >
          +
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">タスクがありません</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskItem task={task} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-gray-300 py-3">{tasks.length}件</p>

      {showForm && <TaskForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
