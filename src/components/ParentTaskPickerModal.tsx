"use client"

import { useEffect, useMemo, useState } from "react"
import type { Task } from "@/types/task"
import { STATUS_ACCENT } from "@/constants/styles"
import type { CSSProperties } from "react"

export function ParentTaskPickerModal({
  open,
  onClose,
  currentTask,
  allTasks,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  currentTask: Task
  allTasks: Task[]
  onSelect: (parentId: string | null) => void
}) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    setQuery("")
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const excluded = useMemo(() => collectExcludedIds(currentTask, allTasks), [currentTask, allTasks])
  const hasParent = currentTask.parentTaskIds.length > 0

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return allTasks
      .filter((t) => !excluded.has(t.id))
      .filter((t) => (needle ? t.title.toLowerCase().includes(needle) : true))
      .slice(0, 50)
  }, [allTasks, excluded, query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end lg:justify-center lg:items-center lg:p-6"
      data-testid="parent-picker-modal"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} data-testid="parent-picker-backdrop" />

      <div
        className="relative rounded-t-2xl px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto overscroll-contain lg:rounded-2xl lg:w-full lg:max-h-[80vh] lg:pb-6 lg:border lg:border-[var(--border-strong)] lg:mx-auto lg:max-w-md"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden" style={{ backgroundColor: "var(--border-strong)" }} />

        <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
          ✦ Set Parent
        </h2>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトルで検索"
          autoFocus
          className="field w-full mb-4"
          data-testid="parent-picker-search"
        />

        <div className="flex flex-col gap-2">
          {candidates.length === 0 && (
            <p className="text-sm text-[var(--text-faint)] py-4 text-center">
              {query ? "該当するタスクがありません" : "候補となるタスクがありません"}
            </p>
          )}
          {candidates.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid="parent-picker-candidate"
              data-task-id={t.id}
              onClick={() => {
                onSelect(t.id)
                onClose()
              }}
              className="flex items-center gap-2 w-full text-left rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 hover:border-[var(--border-accent)] transition-colors"
              style={{ minHeight: "var(--tap-min)" }}
            >
              {t.icon && (
                t.icon.type === "emoji" ? (
                  <span aria-hidden="true" className="flex-shrink-0 text-base leading-none">{t.icon.emoji}</span>
                ) : (
                  <img src={t.icon.url} alt="" className="flex-shrink-0 w-4 h-4 rounded object-cover" />
                )
              )}
              <span className="flex-1 min-w-0 text-sm text-[var(--text)] break-words">{t.title}</span>
              <span
                aria-hidden="true"
                className="status-dot flex-shrink-0"
                style={{ "--status-color": STATUS_ACCENT[t.status ?? "未着手"] } as CSSProperties}
              />
            </button>
          ))}
        </div>

        {hasParent && (
          <button
            type="button"
            data-testid="parent-picker-clear"
            onClick={() => {
              onSelect(null)
              onClose()
            }}
            className="font-pixel mt-4 flex items-center justify-center gap-2 w-full rounded-lg py-3 text-xs text-[var(--text-dim)] hover:text-[var(--status-cancel)] hover:border-[var(--status-cancel)] transition-colors tracking-widest uppercase"
            style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
          >
            親を解除
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="font-pixel mt-4 flex items-center justify-center gap-2 w-full rounded-lg py-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors tracking-widest uppercase"
          style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

// 自タスク + その子孫を候補から除外する（循環防止）。
// 双方向 relation のため childTaskIds と parentTaskIds 両側から辿る。
function collectExcludedIds(root: Task, allTasks: Task[]): Set<string> {
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const excluded = new Set<string>([root.id])
  const queue: string[] = [root.id]
  while (queue.length > 0) {
    const id = queue.shift()!
    const node = byId.get(id)
    const childIds = new Set<string>(node?.childTaskIds ?? [])
    for (const t of allTasks) {
      if (t.parentTaskIds.includes(id)) childIds.add(t.id)
    }
    for (const cid of childIds) {
      if (!excluded.has(cid)) {
        excluded.add(cid)
        queue.push(cid)
      }
    }
  }
  return excluded
}
