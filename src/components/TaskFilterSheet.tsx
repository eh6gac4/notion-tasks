"use client"

import { useState, useEffect } from "react"
import type { AdvancedFilter, DueDateMode, TaskPriority } from "@/types/task"
import { DEFAULT_ADVANCED_FILTER } from "@/constants/filters"
import { PRIORITY_STYLES } from "@/constants/styles"

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
    <div data-testid="task-filter-sheet" className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative rounded-t-2xl px-5 pt-4 pb-10 safe-bottom max-h-[85svh] overflow-y-auto"
        style={{
          backgroundColor: "#160022",
          borderTop: "1px solid rgba(255,0,204,0.5)",
          boxShadow: "0 -4px 30px rgba(255,0,204,0.2)",
        }}
      >
        <button onClick={onClose} className="w-full flex justify-center pb-2 -mt-1" aria-label="閉じる">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,0,204,0.4)" }} />
        </button>

        <h2 className="text-sm text-[#ff00cc] tracking-widest uppercase mb-5 cyber-glow-text-sm">
          ✦ Filters
        </h2>

        <div className="flex flex-col gap-5">
          {/* タグ */}
          <div>
            <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">タグ</p>
            {tagOptions.length === 0 ? (
              <p className="text-xs text-[#553355] italic">タグがありません</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-2 rounded-full text-xs transition-all"
                    style={
                      draft.tags.includes(tag)
                        ? { backgroundColor: "#ff00cc", color: "#0d0014", border: "1px solid transparent", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                        : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 期限 */}
          <div>
            <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">期限</p>
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
                    className="px-3 py-2 rounded-full text-xs transition-all"
                    style={
                      active
                        ? { backgroundColor: "#ff00cc", color: "#0d0014", border: "1px solid transparent", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                        : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 優先度 */}
          <div>
            <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">優先度</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const active = draft.priorities.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    data-testid={`priority-${p}`}
                    onClick={() => togglePriority(p)}
                    className="px-3 py-2 rounded-full text-xs transition-all"
                    style={
                      active
                        ? { backgroundColor: "#ff00cc", color: "#0d0014", border: "1px solid transparent", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                        : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                    }
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
            className="flex-1 rounded-xl py-3 text-xs text-[#996688] hover:text-[#ffbbee] transition-colors tracking-widest uppercase"
            style={{ border: "1px solid rgba(255,0,204,0.25)" }}
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[2] rounded-xl py-3 text-sm tracking-widest uppercase"
            style={{
              backgroundColor: "#ff00cc",
              color: "#0d0014",
              boxShadow: "0 0 12px rgba(255,0,204,0.5), 0 0 30px rgba(255,0,204,0.2)",
            }}
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
