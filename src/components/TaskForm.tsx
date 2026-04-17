"use client"

import { useState, useTransition } from "react"
import type { TaskStatus, TaskPriority, TaskTag, CreateTaskInput } from "@/types/task"
import { createTaskAction } from "@/app/actions"

const PRIORITY_OPTIONS: TaskPriority[] = ["high", "medium", "low"]
const TAG_OPTIONS: TaskTag[] = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]
const PRIORITY_LABELS: Record<TaskPriority, string> = { high: "High", medium: "Med", low: "Low" }

export function TaskForm({ onClose }: { onClose: () => void }) {
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState<TaskStatus>("未着手")
  const [priority, setPriority] = useState<TaskPriority | "">("")
  const [due, setDue] = useState("")
  const [tags, setTags] = useState<TaskTag[]>([])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function toggleTag(tag: TaskTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError("")

    const input: CreateTaskInput = {
      title: title.trim(),
      status,
      ...(priority && { priority }),
      ...(due && { due }),
      ...(tags.length > 0 && { tags }),
    }

    startTransition(async () => {
      try {
        await createTaskAction(input)
        onClose()
      } catch {
        setError("作成に失敗しました")
        setSubmitting(false)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">タスクを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              placeholder="タスク名"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(["未着手", "進行中", "確認中"] as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">なし</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">期限</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">タグ</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    tags.includes(tag)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
