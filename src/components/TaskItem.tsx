"use client"

import { useOptimistic, useTransition, useRef, useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES, PRIORITY_STYLES } from "@/constants/styles"
import { formatDueShort, isOverdue } from "@/lib/due-date"

export function TaskItem({ task, onSelect }: { task: Task; onSelect: (id: string) => void }) {
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const status = optimisticStatus
  const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES["未着手"]) : STATUS_STYLES["未着手"]
  const overdue = isOverdue(task.due)

  return (
    <div
      data-testid="task-item"
      className="px-4 py-4 hover:bg-[var(--surface)] active:bg-[var(--surface-2)] transition-colors cursor-pointer"
      onClick={() => onSelect(task.id)}
    >
      <p data-testid="task-title" className="block w-full text-left mb-3 min-h-[44px] flex items-center text-sm text-[var(--text)] leading-snug">{task.title}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex">
          <span data-testid="task-status-badge" className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${statusStyle}`}>
            {status ?? "未着手"}
          </span>
          <select
            ref={selectRef}
            defaultValue={status ?? "未着手"}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const next = e.target.value as TaskStatus
              startTransition(async () => {
                setUpdateError(null)
                setOptimisticStatus(next)
                if (selectRef.current) selectRef.current.value = next
                try {
                  await updateTaskStatus(task.id, next)
                } catch {
                  setUpdateError("ステータスの更新に失敗しました")
                  if (selectRef.current) selectRef.current.value = task.status ?? "未着手"
                }
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
          <span className={`text-xs ${PRIORITY_STYLES[task.priority].color}`}>
            {PRIORITY_STYLES[task.priority].label}
          </span>
        )}
        {task.due && (
          <span className={`font-pixel text-xs ${overdue ? "text-[var(--status-cancel)]" : "text-[var(--text-dim)]"}`}>
            {overdue ? "⚠ " : ""}{formatDueShort(task.due)}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="font-pixel text-xs text-[var(--text-dim)] border border-[var(--border-strong)] px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span className="font-pixel text-xs text-[var(--text-faint)] border border-[var(--border)] px-2 py-1 rounded-full">
            +{task.tags.length - 2}
          </span>
        )}
        {task.childTaskIds.length > 0 && (
          <span className="text-xs text-[var(--text-faint)]">子{task.childTaskIds.length}件</span>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        {(["進行中", "完了", "中止"] as TaskStatus[]).filter((s) => s !== status).map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation()
              startTransition(async () => {
                setUpdateError(null)
                setOptimisticStatus(s)
                try {
                  await updateTaskStatus(task.id, s)
                } catch {
                  setUpdateError("ステータスの更新に失敗しました")
                }
              })
            }}
            className={`text-xs px-3 py-1 rounded-md border min-h-[36px] active:opacity-70 hover:opacity-80 transition-opacity ${STATUS_STYLES[s]}`}
          >
            → {s}
          </button>
        ))}
      </div>

      {updateError && (
        <p className="text-xs text-[var(--status-cancel)] mt-2">{updateError}</p>
      )}
    </div>
  )
}
