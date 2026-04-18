"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"

const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]

const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "bg-gray-100 text-gray-600",
  "進行中":       "bg-blue-100 text-blue-700",
  "確認中":       "bg-yellow-100 text-yellow-700",
  "一時中断":     "bg-orange-100 text-orange-700",
  "完了":         "bg-green-100 text-green-700",
  "中止":         "bg-red-100 text-red-600",
  "アーカイブ済み": "bg-gray-100 text-gray-400",
}

const PRIORITY_STYLES = {
  high:   { label: "↑ High", color: "text-red-500" },
  medium: { label: "→ Med",  color: "text-yellow-500" },
  low:    { label: "↓ Low",  color: "text-green-500" },
}

export function TaskItem({ task }: { task: Task }) {
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<TaskStatus | null>(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setStatus(task.status)
    if (selectRef.current) selectRef.current.value = task.status ?? "未着手"
  }, [task.status])

  const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES["未着手"]) : STATUS_STYLES["未着手"]
  const due = task.due ? new Date(task.due) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = due !== null && due < today

  return (
    <div className="px-4 py-4 active:bg-gray-50">
      <a href={task.url} target="_blank" rel="noopener noreferrer" className="block mb-2.5">
        <p className="text-base font-medium text-gray-900 leading-snug">{task.title}</p>
      </a>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle}`}>
            {status ?? "未着手"}
          </span>
          <select
            ref={selectRef}
            defaultValue={status ?? "未着手"}
            onChange={(e) => {
              const next = e.target.value as TaskStatus
              setStatus(next)
              startTransition(async () => {
                await updateTaskStatus(task.id, next)
              })
            }}
            className="absolute inset-0 w-full h-full cursor-pointer"
            style={{ opacity: 0.001 }}
            aria-label="ステータスを変更"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {task.priority && (
          <span className={`text-xs font-medium ${PRIORITY_STYLES[task.priority].color}`}>
            {PRIORITY_STYLES[task.priority].label}
          </span>
        )}
        {due && (
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "⚠ " : ""}{due.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
        {task.childTaskIds.length > 0 && (
          <span className="text-xs text-gray-400">子{task.childTaskIds.length}件</span>
        )}
      </div>
    </div>
  )
}
