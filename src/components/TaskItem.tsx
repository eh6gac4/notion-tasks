"use client"

import { useOptimistic, useTransition, useState, useRef, useEffect } from "react"
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  function handleStatusChange(status: TaskStatus) {
    setMenuOpen(false)
    startTransition(async () => {
      setOptimisticStatus(status)
      await updateTaskStatus(task.id, status)
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
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              aria-label="ステータスを変更"
            >
              <StatusBadge status={optimisticStatus} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-28">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${s === optimisticStatus ? "font-semibold" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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
      </div>
    </div>
  )
}
