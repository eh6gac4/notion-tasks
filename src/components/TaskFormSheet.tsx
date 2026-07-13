"use client"

import { useEffect, useState, useRef, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { createTaskAction } from "@/app/actions"
import { buildDue } from "@/lib/due-date"
import { DueDateTimeInput } from "./DueDateTimeInput"
import { TagSelector } from "./TagSelector"
import { useTasksRefresh } from "./TasksRefreshContext"
import type { TaskStatus, TaskPriority } from "@/types/task"

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-pixel w-full rounded-lg py-3 text-sm tracking-widest uppercase font-semibold disabled:opacity-40 transition-all"
      style={{
        backgroundColor: "var(--accent)",
        color: "var(--bg)",
        boxShadow: pending ? "none" : "0 0 8px rgba(220,20,60,0.4)",
        minHeight: "var(--tap-min)",
      }}
    >
      {pending ? "..." : label}
    </button>
  )
}

export function TaskFormSheet({
  open,
  onClose,
  tagOptions,
  locationOptions = [],
  parentTaskId,
  heading = "✦ New Task",
  submitLabel = "CREATE TASK",
  onCreated,
}: {
  open: boolean
  onClose: () => void
  tagOptions: string[]
  locationOptions?: string[]
  parentTaskId?: string
  heading?: string
  submitLabel?: string
  onCreated?: () => void
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("")
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const refreshTasks = useTasksRefresh()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  function reset() {
    formRef.current?.reset()
    setSelectedTags([])
    setDueDate("")
    setDueTime("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleAction(formData: FormData) {
    const title = (formData.get("title") as string)?.trim()
    if (!title) return
    const body = (formData.get("body") as string)?.trim() || undefined

    startTransition(async () => {
      await createTaskAction({
        title,
        status: (formData.get("status") as TaskStatus) || "未着手",
        priority: (formData.get("priority") as TaskPriority) || undefined,
        due: buildDue(dueDate, dueTime) ?? undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        location: (formData.get("location") as string) || undefined,
        body,
        parentTaskId,
      })
      handleClose()
      refreshTasks()
      onCreated?.()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:justify-center lg:items-center lg:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

      <div
        className="relative rounded-t-2xl px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto overscroll-contain lg:rounded-2xl lg:w-full lg:max-h-[80vh] lg:pb-6 lg:border lg:border-[var(--border-strong)] lg:mx-auto lg:max-w-lg"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden" style={{ backgroundColor: "var(--border-strong)" }} />

        <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
          {heading}
        </h2>

        <form ref={formRef} action={handleAction} className="flex flex-col gap-4">
          <input
            name="title"
            type="text"
            placeholder="TASK NAME (required)"
            required
            autoFocus
            className="field w-full"
          />

          <textarea
            name="body"
            placeholder="BODY (optional)"
            rows={3}
            className="field w-full resize-none min-h-[88px]"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              name="status"
              defaultValue="未着手"
              className="field w-full"
            >
              {(["未着手", "進行中", "確認中"] as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue=""
              className="field w-full"
            >
              <option value="">Priority</option>
              <option value="high">🚨 High</option>
              <option value="medium">⚠️ Med</option>
              <option value="low">💤 Low</option>
            </select>
          </div>

          <div>
            <label className="font-pixel block text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">期限</label>
            <DueDateTimeInput
              date={dueDate}
              time={dueTime}
              onChange={(d, t) => {
                setDueDate(d)
                setDueTime(t)
              }}
            />
          </div>

          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">場所</p>
            <select name="location" defaultValue="" className="field w-full">
              <option value="">(指定なし)</option>
              {locationOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">タグ</p>
            <TagSelector options={tagOptions} selected={selectedTags} onChange={setSelectedTags} />
          </div>

          <SubmitButton label={submitLabel} />
        </form>
      </div>
    </div>
  )
}
