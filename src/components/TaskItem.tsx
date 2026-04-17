"use client"

import { useOptimistic, useTransition, useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { updateTaskStatus } from "@/app/actions"

const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]

function formatDue(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null
  const date = new Date(due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = date < today
  const label = date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
  return { label, overdue }
}

export function TaskItem({ task }: { task: Task }) {
  const due = formatDue(task.due)
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as TaskStatus
    setActionError(null)
    startTransition(async () => {
      setOptimisticStatus(status)
      try {
        await updateTaskStatus(task.id, status)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 hover:underline line-clamp-1"
        >
          {task.title}
        </a>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <div className="relative">
            <select
              value={optimisticStatus ?? ""}
              onChange={handleStatusChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              aria-label="ステータスを変更"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <StatusBadge status={optimisticStatus} />
          </div>
          <PriorityBadge priority={task.priority} />
          {due && (
            <span className={`text-xs ${due.overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {due.overdue ? "⚠ " : ""}{due.label}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {task.childTaskIds.length > 0 && (
            <span className="text-xs text-gray-400">子{task.childTaskIds.length}件</span>
          )}
        </div>
        {actionError && (
          <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 break-all">
            ⚠ {actionError}
          </p>
        )}
      </div>
    </div>
  )
}
