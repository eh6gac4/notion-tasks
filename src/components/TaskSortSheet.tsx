"use client"

import { useState, useEffect } from "react"
import type { SortConfig, SortDirection, SortKey } from "@/types/task"
import { DEFAULT_SORT } from "@/lib/task-sort"

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
  backgroundColor: "#ff00cc",
  color: "#0d0014",
  border: "1px solid transparent",
  boxShadow: "0 0 8px rgba(255,0,204,0.5)",
}

const INACTIVE_STYLE = {
  backgroundColor: "#0d0014",
  color: "#996688",
  border: "1px solid rgba(255,0,204,0.2)",
}

const DISABLED_STYLE = {
  backgroundColor: "#0d0014",
  color: "#553355",
  border: "1px solid rgba(255,0,204,0.1)",
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
          ✦ Sort By
        </h2>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">並び替え</p>
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
                    className="px-3 py-2 rounded-full text-xs transition-all"
                    style={active ? ACTIVE_STYLE : INACTIVE_STYLE}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">方向</p>
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
                    className="px-3 py-2 rounded-full text-xs transition-all"
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
