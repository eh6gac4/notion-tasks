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
      className="w-full bg-blue-600 text-white rounded-xl py-4 text-base font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
    >
      {pending ? "作成中…" : "作成する"}
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
        className="fixed bottom-8 right-6 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl active:bg-blue-700 transition-colors"
        aria-label="タスクを追加"
      >
        +
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Sheet */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl px-5 pt-4 pb-10 safe-bottom max-h-[85svh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />

            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">タスクを追加</h2>

            <form ref={formRef} action={handleAction} className="flex flex-col gap-4">
              {/* Title */}
              <input
                name="title"
                type="text"
                placeholder="タスク名（必須）"
                required
                autoFocus
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="status"
                  defaultValue="未着手"
                  className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(["未着手", "進行中", "確認中"] as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  name="priority"
                  defaultValue=""
                  className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Priority</option>
                  <option value="high">↑ High</option>
                  <option value="medium">→ Med</option>
                  <option value="low">↓ Low</option>
                </select>
              </div>

              {/* Due */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">期限</label>
                <input
                  name="due"
                  type="date"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">タグ</p>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 active:bg-gray-200"
                      }`}
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
