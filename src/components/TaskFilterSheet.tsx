"use client"

import { useState, useEffect } from "react"
import type { AdvancedFilter, DueDateMode, TaskPriority } from "@/types/task"
import { DEFAULT_ADVANCED_FILTER } from "@/constants/filters"
import { PRIORITY_STYLES, PILL_BUTTON_CLASS, pillButtonStyle } from "@/constants/styles"

const DUE_OPTIONS: { value: DueDateMode; label: string }[] = [
  { value: "any",     label: "不問" },
  { value: "with",    label: "あり" },
  { value: "overdue", label: "期限切れ" },
  { value: "without", label: "なし" },
]

const PRIORITY_OPTIONS: TaskPriority[] = ["high", "medium", "low"]

export function TaskFilterSheet({
  open,
  filter,
  tagOptions,
  onApply,
  onClose,
}: {
  open: boolean
  filter: AdvancedFilter
  tagOptions: string[]
  onApply: (next: AdvancedFilter) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AdvancedFilter>(filter)

  // 開くたびに親の現状フィルタで draft を初期化
  useEffect(() => {
    if (open) setDraft(filter)
  }, [open, filter])

  function toggleTag(tag: string) {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }))
  }

  function setDue(mode: DueDateMode) {
    setDraft((d) => ({ ...d, dueDate: mode }))
  }

  function togglePriority(p: TaskPriority) {
    setDraft((d) => ({
      ...d,
      priorities: d.priorities.includes(p) ? d.priorities.filter((x) => x !== p) : [...d.priorities, p],
    }))
  }

  function handleReset() {
    setDraft(DEFAULT_ADVANCED_FILTER)
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  if (!open) return null

  return (
    <div data-testid="task-filter-sheet" className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center lg:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative rounded-none-2xl px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto lg:rounded-none lg:w-full lg:max-h-[80vh] lg:pb-6 lg:border lg:border-[var(--border-strong)] lg:mx-auto lg:max-w-lg"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={onClose} className="w-full flex justify-center pb-2 -mt-1 lg:hidden" aria-label="閉じる">
          <div className="w-10 h-1 rounded-none" style={{ backgroundColor: "var(--border-strong)" }} />
        </button>

        <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
          ✦ Filters
        </h2>

        <div className="flex flex-col gap-5">
          {/* タグ */}
          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">タグ</p>
            {tagOptions.length === 0 ? (
              <p className="text-xs text-[var(--text-faint)] italic">タグがありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={PILL_BUTTON_CLASS}
                    style={pillButtonStyle(draft.tags.includes(tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 期限 */}
          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">期限</p>
            <div className="flex flex-wrap gap-2">
              {DUE_OPTIONS.map((opt) => {
                const active = draft.dueDate === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`due-${opt.value}`}
                    aria-pressed={active}
                    onClick={() => setDue(opt.value)}
                    className={PILL_BUTTON_CLASS}
                    style={pillButtonStyle(active)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 優先度 */}
          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">優先度</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const active = draft.priorities.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    data-testid={`priority-${p}`}
                    onClick={() => togglePriority(p)}
                    className={PILL_BUTTON_CLASS}
                    style={pillButtonStyle(active)}
                  >
                    {PRIORITY_STYLES[p].label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={handleReset}
            className="font-pixel flex-1 rounded-none py-3 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors tracking-widest uppercase"
            style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="font-pixel flex-[2] rounded-none py-3 text-sm tracking-widest uppercase font-semibold"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              boxShadow: "0 0 8px rgba(220,20,60,0.4)",
              minHeight: "var(--tap-min)",
            }}
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
