"use client"

import { useOptimistic, useTransition, useRef, useState } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, PRIORITY_STYLES } from "@/constants/styles"
import { formatDueShort, isOverdue } from "@/lib/due-date"

// ボード上の1カード。カラム自体が現ステータスを示すため status badge は出さず、
// ⋮ ボタン上に透明な select を被せて「タップで他カラムへ移動」を成立させる。
export function TaskItem({ task, onSelect }: { task: Task; onSelect: (id: string) => void }) {
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const status = optimisticStatus
  const overdue = isOverdue(task.due)
  const hasMeta = task.priority || task.due || task.tags.length > 0 || task.childTaskIds.length > 0

  return (
    <div
      data-testid="task-item"
      data-task-id={task.id}
      className="rounded-md border border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--border-accent)] transition-colors cursor-pointer"
      onClick={() => onSelect(task.id)}
    >
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        <p
          data-testid="task-title"
          className="flex-1 min-w-0 text-sm text-[var(--text)] leading-snug font-medium break-words"
        >
          {task.title}
        </p>
        <div className="relative flex-shrink-0 -mt-1 -mr-1">
          <button
            type="button"
            tabIndex={-1}
            aria-label="ステータスを変更"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="6" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="18" r="1" />
            </svg>
          </button>
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
      </div>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
          {task.priority && (
            <span className={`text-[11px] ${PRIORITY_STYLES[task.priority].color}`}>
              {PRIORITY_STYLES[task.priority].label}
            </span>
          )}
          {task.due && (
            <span className={`font-pixel text-[11px] ${overdue ? "text-[var(--status-cancel)]" : "text-[var(--text-dim)]"}`}>
              {overdue ? "⚠ " : ""}{formatDueShort(task.due)}
            </span>
          )}
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="font-pixel text-[10px] text-[var(--text-dim)] border border-[var(--border-strong)] px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="font-pixel text-[10px] text-[var(--text-faint)]">
              +{task.tags.length - 2}
            </span>
          )}
          {task.childTaskIds.length > 0 && (
            <span className="text-[10px] text-[var(--text-faint)]">子{task.childTaskIds.length}件</span>
          )}
        </div>
      )}

      {updateError && (
        <p className="text-[10px] text-[var(--status-cancel)] px-3 pb-2">{updateError}</p>
      )}
    </div>
  )
}
