"use client"

import { useOptimistic, useTransition, useRef } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES, PRIORITY_STYLES } from "@/constants/styles"

export function TaskItem({ task, onSelect }: { task: Task; onSelect: (id: string) => void }) {
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)

  const status = optimisticStatus
  const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES["未着手"]) : STATUS_STYLES["未着手"]
  const due = task.due ? new Date(task.due) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = due !== null && due < today

  return (
    <div
      className="px-4 py-4 active:bg-[#160022] transition-colors cursor-pointer"
      onClick={() => onSelect(task.id)}
    >
      <p className="block w-full text-left mb-3 min-h-[44px] flex items-center text-sm text-[#ffbbee] leading-snug">{task.title}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex">
          <span className={`px-3 py-1 rounded-full text-xs ${statusStyle}`}>
            {status ?? "未着手"}
          </span>
          <select
            ref={selectRef}
            defaultValue={status ?? "未着手"}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const next = e.target.value as TaskStatus
              startTransition(async () => {
                setOptimisticStatus(next)
                if (selectRef.current) selectRef.current.value = next
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
          <span className={`text-xs ${PRIORITY_STYLES[task.priority].color}`}>
            {PRIORITY_STYLES[task.priority].label}
          </span>
        )}
        {due && (
          <span className={`text-xs ${isOverdue ? "text-[#ff3355]" : "text-[#996688]"}`}>
            {isOverdue ? "⚠ " : ""}{String(due.getMonth() + 1).padStart(2, "0")}/{String(due.getDate()).padStart(2, "0")}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs text-[#996688] bg-[#160022] border border-[rgba(255,0,204,0.2)] px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
        {task.childTaskIds.length > 0 && (
          <span className="text-xs text-[#553355]">子{task.childTaskIds.length}件</span>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        {(["進行中", "完了", "中止"] as TaskStatus[]).filter((s) => s !== status).map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation()
              startTransition(async () => {
                setOptimisticStatus(s)
                await updateTaskStatus(task.id, s)
              })
            }}
            className={`text-xs px-3 py-1 rounded-md border min-h-[36px] active:opacity-70 hover:opacity-80 transition-opacity ${STATUS_STYLES[s]}`}
          >
            → {s}
          </button>
        ))}
      </div>

    </div>
  )
}
