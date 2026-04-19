"use client"

import { useState, useRef, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { createTaskAction } from "@/app/actions"
import type { TaskStatus, TaskPriority, TaskTag } from "@/types/task"

const TAG_OPTIONS: TaskTag[] = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl py-4 text-sm tracking-widest uppercase disabled:opacity-40 transition-all"
      style={{
        backgroundColor: "#ff00cc",
        color: "#0d0014",
        boxShadow: pending ? "none" : "0 0 12px rgba(255,0,204,0.5), 0 0 30px rgba(255,0,204,0.2)",
      }}
    >
      {pending ? "CREATING..." : "CREATE TASK"}
    </button>
  )
}

export function TaskCreate() {
  const [open, setOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<TaskTag[]>([])
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function toggleTag(tag: TaskTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleOpen() {
    setSelectedTags([])
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    formRef.current?.reset()
    setSelectedTags([])
  }

  async function handleAction(formData: FormData) {
    const title = (formData.get("title") as string)?.trim()
    if (!title) return

    startTransition(async () => {
      await createTaskAction({
        title,
        status: (formData.get("status") as TaskStatus) || "未着手",
        priority: (formData.get("priority") as TaskPriority) || undefined,
        due: (formData.get("due") as string) || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
      handleClose()
    })
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={handleOpen}
        className="fixed bottom-8 right-6 z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
        style={{
          backgroundColor: "#ff00cc",
          color: "#0d0014",
          boxShadow: "0 0 15px rgba(255,0,204,0.6), 0 0 40px rgba(255,0,204,0.3)",
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
            className="relative rounded-t-2xl px-5 pt-4 pb-10 safe-bottom max-h-[85svh] overflow-y-auto"
            style={{
              backgroundColor: "#160022",
              borderTop: "1px solid rgba(255,0,204,0.5)",
              boxShadow: "0 -4px 30px rgba(255,0,204,0.2)",
            }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: "rgba(255,0,204,0.4)" }} />

            <h2 className="text-sm text-[#ff00cc] tracking-widest uppercase mb-5 cyber-glow-text-sm">
              ✦ New Task
            </h2>

            <form ref={formRef} action={handleAction} className="flex flex-col gap-4">
              <input
                name="title"
                type="text"
                placeholder="TASK NAME (required)"
                required
                autoFocus
                className="w-full rounded-xl border border-[rgba(255,0,204,0.3)] px-4 py-3.5 text-sm text-[#ffbbee] bg-[#0d0014] placeholder:text-[#553355] focus:outline-none focus:border-[#ff00cc]"
                style={{ transition: "border-color 0.2s" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="status"
                  defaultValue="未着手"
                  className="rounded-xl px-3 py-3.5 text-sm bg-[#0d0014] text-[#ffbbee] focus:outline-none"
                  style={{ border: "1px solid rgba(255,0,204,0.3)" }}
                >
                  {(["未着手", "進行中", "確認中"] as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  name="priority"
                  defaultValue=""
                  className="rounded-xl px-3 py-3.5 text-sm bg-[#0d0014] text-[#ffbbee] focus:outline-none"
                  style={{ border: "1px solid rgba(255,0,204,0.3)" }}
                >
                  <option value="">Priority</option>
                  <option value="high">↑ High</option>
                  <option value="medium">→ Med</option>
                  <option value="low">↓ Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#996688] mb-1.5 tracking-widest uppercase">期限</label>
                <input
                  name="due"
                  type="date"
                  className="w-full rounded-xl px-4 py-3.5 text-sm text-[#ffbbee] bg-[#0d0014] focus:outline-none"
                  style={{ border: "1px solid rgba(255,0,204,0.3)", colorScheme: "dark" }}
                />
              </div>

              <div>
                <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">タグ</p>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={
                        selectedTags.includes(tag)
                          ? { backgroundColor: "#ff00cc", color: "#0d0014", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                          : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                      }
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <SubmitButton />
            </form>
          </div>
        </div>
      )}
    </>
  )
}
