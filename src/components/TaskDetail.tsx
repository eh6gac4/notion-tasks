"use client"

import { useState, useRef, useTransition } from "react"
import type { Task, TaskStatus, TaskPriority } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"

const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]

const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "進行中":       "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "確認中":       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "一時中断":     "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "完了":         "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "中止":         "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
  "アーカイブ済み": "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
}

const PRIORITY_LABELS: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: "↑ High", color: "text-red-500 dark:text-red-400" },
  medium: { label: "→ Med",  color: "text-yellow-500 dark:text-yellow-400" },
  low:    { label: "↓ Low",  color: "text-green-500 dark:text-green-400" },
}

export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<TaskStatus | null>(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)

  const due = task.due ? new Date(task.due) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = due !== null && due < today

  const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES["未着手"]) : STATUS_STYLES["未着手"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl px-5 pt-4 pb-10 max-h-[85svh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-4">
          {task.title}
        </h2>

        {/* Status */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">ステータス</p>
          <div className="relative inline-flex">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusStyle}`}>
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
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Details grid */}
        <div className="space-y-3">
          {task.priority && (
            <Row label="Priority">
              <span className={`text-sm font-medium ${PRIORITY_LABELS[task.priority].color}`}>
                {PRIORITY_LABELS[task.priority].label}
              </span>
            </Row>
          )}

          {due && (
            <Row label="期限">
              <span className={`text-sm ${isOverdue ? "text-red-500 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                {isOverdue ? "⚠ " : ""}
                {due.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </Row>
          )}

          {task.tags.length > 0 && (
            <Row label="タグ">
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </Row>
          )}

          {task.source && (
            <Row label="ソース">
              <span className="text-sm text-gray-700 dark:text-gray-300">{task.source}</span>
            </Row>
          )}

          {task.sourceUrl && (
            <Row label="URL">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 underline break-all">
                {task.sourceUrl}
              </a>
            </Row>
          )}

          {task.childTaskIds.length > 0 && (
            <Row label="子タスク">
              <span className="text-sm text-gray-700 dark:text-gray-300">{task.childTaskIds.length}件</span>
            </Row>
          )}

          {task.parentTaskIds.length > 0 && (
            <Row label="親タスク">
              <span className="text-sm text-gray-700 dark:text-gray-300">{task.parentTaskIds.length}件</span>
            </Row>
          )}
        </div>

        {/* Notion link */}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full border border-gray-200 dark:border-gray-700 rounded-xl py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Notionで開く →
        </a>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
