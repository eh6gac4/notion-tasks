"use client"

import { useEffect, useState, useRef, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { createTaskAction } from "@/app/actions"
import { buildDue } from "@/lib/due-date"
import { DueDateTimeInput } from "./DueDateTimeInput"
import { TagSelector } from "./TagSelector"
import { useTasksRefresh } from "./TasksRefreshContext"
import type { TaskStatus, TaskPriority } from "@/types/task"

function SubmitButton() {
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
      {pending ? "CREATING..." : "CREATE TASK"}
    </button>
  )
}

export function TaskCreate({ tagOptions }: { tagOptions: string[] }) {
  const [open, setOpen] = useState(false)
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

  function handleOpen() {
    setSelectedTags([])
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    formRef.current?.reset()
    setSelectedTags([])
    setDueDate("")
    setDueTime("")
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
        body,
      })
      handleClose()
      refreshTasks()
    })
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className="fixed bottom-8 right-6 z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--bg)",
          boxShadow: "0 0 12px rgba(220,20,60,0.45), 0 4px 12px rgba(0,0,0,0.4)",
        }}
        aria-label="タスクを追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={handleClose} />

          <div
            className="relative rounded-t-2xl px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto overscroll-contain"
            style={{
              backgroundColor: "var(--surface)",
              borderTop: "1px solid var(--border-strong)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--border-strong)" }} />

            <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
              ✦ New Task
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
                <p className="font-pixel text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">タグ</p>
                <TagSelector options={tagOptions} selected={selectedTags} onChange={setSelectedTags} />
              </div>

              <SubmitButton />
            </form>
          </div>
        </div>
      )}
    </>
  )
}
