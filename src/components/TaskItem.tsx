"use client"

import { useOptimistic, useTransition, useRef, useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, PRIORITY_STYLES } from "@/constants/styles"
import { formatDueShort, isOverdue } from "@/lib/due-date"
import { useTasksRefresh } from "./TasksRefreshContext"

// ボード上の1カード。カラム自体が現ステータスを示すが、status pill + ▾ を
// カード右上に小さく置くことで「タップで他カラムへ移動できる」アフォーダンス
// を持たせる。pill 全体に透明 select を被せ、ネイティブのドロップダウンを開く。
export function TaskItem({ task, onSelect }: { task: Task; onSelect: (id: string) => void }) {
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const refreshTasks = useTasksRefresh()

  const status = optimisticStatus
  const overdue = isOverdue(task.due)
  const hasMeta = task.priority || task.due || task.tags.length > 0 || task.childTaskIds.length > 0

  const isDoing = status === "進行中"
  return (
    <div
      data-testid="task-item"
      data-task-id={task.id}
      data-status={status ?? "未着手"}
      className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--border-accent)] card-glow-hover cursor-pointer"
      onClick={() => onSelect(task.id)}
    >
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <p
          data-testid="task-title"
          className="flex-1 min-w-0 text-sm text-[var(--text)] leading-snug font-medium break-words"
        >
          {task.title}
        </p>
        <div className="relative flex-shrink-0 -mt-1">
          <span
            data-testid="task-status-button"
            aria-hidden="true"
            className={`font-pixel inline-flex items-center gap-1 px-3 h-8 rounded text-[11px] tracking-wider uppercase border transition-colors ${
              isDoing
                ? "bg-[var(--accent)] text-[var(--bg)] border-transparent accent-glow-sm"
                : "bg-[var(--surface-2)] border-[var(--border-strong)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-accent)]"
            }`}
          >
            <span>{status ?? "未着手"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
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
                  refreshTasks()
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
      </div>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {task.priority && (
            <span className={`text-[11px] ${PRIORITY_STYLES[task.priority].color}`}>
              {PRIORITY_STYLES[task.priority].label}
            </span>
          )}
          {task.due && (
            <span className={`font-pixel text-[11px] ${overdue ? "text-[var(--status-cancel)] font-semibold" : "text-[var(--text-dim)]"}`}>
              {overdue ? "⚠ " : ""}{formatDueShort(task.due)}
            </span>
          )}
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="font-pixel text-[11px] text-[var(--text-dim)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 rounded">
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="font-pixel text-[11px] text-[var(--text-faint)]">
              +{task.tags.length - 2}
            </span>
          )}
          {task.childTaskIds.length > 0 && (
            <span className="text-[11px] text-[var(--text-faint)]">子{task.childTaskIds.length}件</span>
          )}
        </div>
      )}

      {updateError && (
        <p className="text-[11px] text-[var(--status-cancel)] px-4 pb-3">{updateError}</p>
      )}
    </div>
  )
}
