"use client"

import { useState, useRef, useTransition, useEffect } from "react"
import type { Task, TaskStatus } from "@/types/task"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES, PRIORITY_STYLES } from "@/constants/styles"

export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<TaskStatus | null>(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const due = task.due ? new Date(task.due) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = due !== null && due < today

  const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES["未着手"]) : STATUS_STYLES["未着手"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
      />

      <div
        className={`relative rounded-t-2xl px-5 pt-4 pb-10 max-h-[85svh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{
          backgroundColor: "#160022",
          borderTop: "1px solid rgba(255,0,204,0.5)",
          boxShadow: "0 -4px 30px rgba(255,0,204,0.2)",
        }}
      >
        {/* Handle */}
        <button onClick={handleClose} className="w-full flex justify-center pb-2 -mt-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,0,204,0.4)" }} />
        </button>

        {/* Title */}
        <h2 className="text-base text-[#ffbbee] leading-snug mb-4">
          {task.title}
        </h2>

        {/* Status */}
        <div className="mb-4">
          <p className="text-xs text-[#996688] mb-1.5 tracking-widest uppercase">Status</p>
          <div className="relative inline-flex">
            <span className={`px-3 py-1.5 rounded-full text-sm ${statusStyle}`}>
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

        {/* Details */}
        <div className="space-y-3">
          {task.priority && (
            <Row label="Priority">
              <span className={`text-sm ${PRIORITY_STYLES[task.priority].color}`}>
                {PRIORITY_STYLES[task.priority].label}
              </span>
            </Row>
          )}

          {due && (
            <Row label="期限">
              <span className={`text-sm ${isOverdue ? "text-[#ff3355]" : "text-[#ffbbee]"}`}>
                {isOverdue ? "⚠ " : ""}
                {due.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </Row>
          )}

          {task.tags.length > 0 && (
            <Row label="タグ">
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs text-[#996688] bg-[#0d0014] border border-[rgba(255,0,204,0.2)] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </Row>
          )}

          {task.source && (
            <Row label="ソース">
              <span className="text-sm text-[#ffbbee]">{task.source}</span>
            </Row>
          )}

          {task.sourceUrl && (
            <Row label="URL">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#ff00cc] underline break-all hover:text-[#ffaaee]">
                {task.sourceUrl}
              </a>
            </Row>
          )}

          {task.childTaskIds.length > 0 && (
            <Row label="子タスク">
              <span className="text-sm text-[#ffbbee]">{task.childTaskIds.length}件</span>
            </Row>
          )}

          {task.parentTaskIds.length > 0 && (
            <Row label="親タスク">
              <span className="text-sm text-[#ffbbee]">{task.parentTaskIds.length}件</span>
            </Row>
          )}
        </div>

        {/* Notion link */}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm text-[#996688] hover:text-[#ff00cc] transition-colors tracking-widest uppercase"
          style={{ border: "1px solid rgba(255,0,204,0.25)" }}
        >
          Open in Notion →
        </a>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#553355] w-16 flex-shrink-0 pt-0.5 tracking-wide">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
