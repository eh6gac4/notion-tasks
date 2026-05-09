"use client"

import { useState, useEffect } from "react"
import type { SortConfig, SortDirection, SortKey } from "@/types/task"
import { DEFAULT_SORT } from "@/lib/task-sort"
import { PILL_BUTTON_CLASS } from "@/constants/styles"

const KEY_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default",  label: "デフォルト" },
  { value: "due",      label: "期限" },
  { value: "priority", label: "優先度" },
]

const DIR_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: "asc",  label: "▲ 昇順" },
  { value: "desc", label: "▼ 降順" },
]

const ACTIVE_STYLE = {
  backgroundColor: "var(--accent)",
  color: "var(--bg)",
  border: "1px solid transparent",
  boxShadow: "0 0 6px rgba(220,20,60,0.45)",
}

const INACTIVE_STYLE = {
  backgroundColor: "transparent",
  color: "var(--text-dim)",
  border: "1px solid var(--border-strong)",
}

const DISABLED_STYLE = {
  backgroundColor: "transparent",
  color: "var(--text-faint)",
  border: "1px solid var(--border)",
  opacity: 0.5,
}

export function TaskSortSheet({
  open,
  sort,
  onApply,
  onClose,
}: {
  open: boolean
  sort: SortConfig
  onApply: (next: SortConfig) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<SortConfig>(sort)

  useEffect(() => {
    if (open) setDraft(sort)
  }, [open, sort])

  function setKey(key: SortKey) {
    setDraft((d) => ({ ...d, key }))
  }

  function setDirection(direction: SortDirection) {
    setDraft((d) => ({ ...d, direction }))
  }

  function handleReset() {
    setDraft(DEFAULT_SORT)
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  if (!open) return null

  const directionDisabled = draft.key === "default"

  return (
    <div data-testid="task-sort-sheet" className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative rounded-t-2xl px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={onClose} className="w-full flex justify-center pb-2 -mt-1" aria-label="閉じる">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border-strong)" }} />
        </button>

        <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
          ✦ Sort By
        </h2>

        <div className="flex flex-col gap-5">
          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">並び替え</p>
            <div className="flex flex-wrap gap-2">
              {KEY_OPTIONS.map((opt) => {
                const active = draft.key === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`sort-key-${opt.value}`}
                    aria-pressed={active}
                    onClick={() => setKey(opt.value)}
                    className={PILL_BUTTON_CLASS}
                    style={active ? ACTIVE_STYLE : INACTIVE_STYLE}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">方向</p>
            <div className="flex flex-wrap gap-2">
              {DIR_OPTIONS.map((opt) => {
                const active = !directionDisabled && draft.direction === opt.value
                const style = directionDisabled
                  ? DISABLED_STYLE
                  : active
                    ? ACTIVE_STYLE
                    : INACTIVE_STYLE
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`sort-dir-${opt.value}`}
                    aria-pressed={active}
                    disabled={directionDisabled}
                    onClick={() => setDirection(opt.value)}
                    className={PILL_BUTTON_CLASS}
                    style={style}
                  >
                    {opt.label}
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
            className="font-pixel flex-1 rounded-lg py-3 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors tracking-widest uppercase"
            style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="font-pixel flex-[2] rounded-lg py-3 text-sm tracking-widest uppercase font-semibold"
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
