"use client"

import { useTransition, useState, useEffect } from "react"
import type { Task, TaskStatus, TaskPriority, TaskTag } from "@/types/task"
import { updateTaskAction } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES } from "@/constants/styles"

const TAG_OPTIONS: TaskTag[] = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]

export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [visible, setVisible] = useState(false)

  const [editTitle, setEditTitle] = useState(task.title)
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status ?? "未着手")
  const [editPriority, setEditPriority] = useState<TaskPriority | "">(task.priority ?? "")
  const [editDue, setEditDue] = useState(task.due ?? "")
  const [editTags, setEditTags] = useState<TaskTag[]>(task.tags)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function save(input: Parameters<typeof updateTaskAction>[1]) {
    startTransition(async () => {
      await updateTaskAction(task.id, input)
    })
  }

  function handleStatusChange(next: TaskStatus) {
    setEditStatus(next)
    save({ status: next })
  }

  function handlePriorityChange(next: TaskPriority | "") {
    setEditPriority(next)
    save({ priority: next || undefined })
  }

  function handleDueChange(next: string) {
    setEditDue(next)
    save({ due: next || null })
  }

  function toggleTag(tag: TaskTag) {
    const next = editTags.includes(tag)
      ? editTags.filter((t) => t !== tag)
      : [...editTags, tag]
    setEditTags(next)
    save({ tags: next })
  }

  const statusStyle = STATUS_STYLES[editStatus] ?? STATUS_STYLES["未着手"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
      />

      <div
        className={`relative rounded-t-2xl px-5 pt-4 pb-10 max-h-[85svh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
        style={{
          backgroundColor: "#160022",
          borderTop: "1px solid rgba(255,0,204,0.5)",
          boxShadow: "0 -4px 30px rgba(255,0,204,0.2)",
          opacity: isPending ? 0.85 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {/* Handle */}
        <button onClick={handleClose} className="w-full flex justify-center pb-2 -mt-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,0,204,0.4)" }} />
        </button>

        {/* Title — blur で保存 */}
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => { if (editTitle.trim()) save({ title: editTitle }) }}
          className="w-full rounded-xl border border-[rgba(255,0,204,0.3)] px-4 py-3 text-sm text-[#ffbbee] bg-[#0d0014] placeholder:text-[#553355] focus:outline-none focus:border-[#ff00cc] mb-4"
          style={{ transition: "border-color 0.2s" }}
          aria-label="タイトル"
        />

        {/* Status */}
        <div className="mb-4">
          <p className="text-xs text-[#996688] mb-1.5 tracking-widest uppercase">Status</p>
          <div className="relative inline-flex">
            <span className={`px-3 py-1.5 rounded-full text-sm ${statusStyle}`}>
              {editStatus}
            </span>
            <select
              value={editStatus}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="absolute inset-0 w-full h-full cursor-pointer"
              style={{ opacity: 0.001 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <Row label="Priority">
            <select
              value={editPriority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority | "")}
              className="rounded-xl px-3 py-2 text-sm bg-[#0d0014] text-[#ffbbee] focus:outline-none"
              style={{ border: "1px solid rgba(255,0,204,0.3)" }}
            >
              <option value="">未設定</option>
              <option value="high">↑ High</option>
              <option value="medium">→ Med</option>
              <option value="low">↓ Low</option>
            </select>
          </Row>

          <Row label="期限">
            <input
              type="date"
              value={editDue}
              onChange={(e) => handleDueChange(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm text-[#ffbbee] bg-[#0d0014] focus:outline-none"
              style={{ border: "1px solid rgba(255,0,204,0.3)", colorScheme: "dark" }}
            />
          </Row>

          <Row label="タグ">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all"
                  style={
                    editTags.includes(tag)
                      ? { backgroundColor: "#ff00cc", color: "#0d0014", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                      : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </Row>

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
