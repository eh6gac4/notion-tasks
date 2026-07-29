"use client"

import { useEffect, useMemo, useState } from "react"
import type { Task } from "@/types/task"
import { STATUS_ACCENT } from "@/constants/styles"
import type { CSSProperties } from "react"

export function TaskPickerModal({
  open,
  onClose,
  title = "タスクを選択",
  currentTask,
  allTasks,
  selectedIds,
  onSave,
}: {
  open: boolean
  onClose: () => void
  title?: string
  currentTask: Task
  allTasks: Task[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(new Set(selectedIds))
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = prev }
    }
  }, [open, selectedIds])

  const excluded = useMemo(() => new Set([currentTask.id]), [currentTask.id])

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return allTasks
      .filter((t) => !excluded.has(t.id))
      .filter((t) => (needle ? t.title.toLowerCase().includes(needle) : true))
      .slice(0, 50)
  }, [allTasks, excluded, query])

  if (!open) return null

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelected(next)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end lg:justify-center lg:items-center lg:p-6"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative flex flex-col rounded-none-2xl pt-4 pb-0 safe-bottom h-[85svh] lg:h-auto lg:max-h-[80vh] lg:rounded-none lg:w-full lg:border lg:border-[var(--border-strong)] lg:mx-auto lg:max-w-md"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div className="px-4 flex-shrink-0">
          <div className="w-10 h-1 rounded-none mx-auto mb-4 lg:hidden" style={{ backgroundColor: "var(--border-strong)" }} />

          <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
            ✦ {title}
          </h2>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトルで検索"
            autoFocus
            className="field w-full mb-4"
          />
        </div>

        <div className="px-4 flex-1 overflow-y-auto overscroll-contain pb-8 lg:pb-6">
          <div className="flex flex-col gap-2">
            {candidates.length === 0 && (
              <p className="text-sm text-[var(--text-faint)] py-4 text-center">
                {query ? "該当するタスクがありません" : "候補となるタスクがありません"}
              </p>
            )}
            {candidates.map((t) => {
              const isSelected = selected.has(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`flex items-center gap-2 w-full text-left rounded-none border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)] bg-opacity-10"
                      : "border-[var(--border-strong)] bg-[var(--surface-2)] hover:border-[var(--border-accent)]"
                  }`}
                  style={{ minHeight: "var(--tap-min)" }}
                >
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)]"}`}>
                    {isSelected && <span className="text-[var(--bg)] text-[10px]">✓</span>}
                  </div>
                  {t.icon && (
                    t.icon.type === "emoji" ? (
                      <span aria-hidden="true" className="flex-shrink-0 text-base leading-none">{t.icon.emoji}</span>
                    ) : (
                      <img src={t.icon.url} alt="" className="flex-shrink-0 w-4 h-4 rounded-none object-cover" />
                    )
                  )}
                  <span className="flex-1 min-w-0 text-sm text-[var(--text)] break-words">{t.title}</span>
                  <span
                    aria-hidden="true"
                    className="status-dot flex-shrink-0"
                    style={{ "--status-color": STATUS_ACCENT[t.status ?? "未着手"] } as CSSProperties}
                  />
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="font-pixel flex-1 flex items-center justify-center gap-2 rounded-none py-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors tracking-widest uppercase"
              style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(Array.from(selected))
                onClose()
              }}
              className="font-pixel flex-1 flex items-center justify-center gap-2 rounded-none py-3 text-xs text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 transition-colors tracking-widest uppercase"
              style={{ minHeight: "var(--tap-min)" }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
