"use client"

import { useState } from "react"
import { PILL_BUTTON_CLASS, PILL_BUTTON_CLASS_LG, pillButtonStyle } from "@/constants/styles"

const MAX_TAG_LENGTH = 100

export function TagSelector({
  options,
  selected,
  onChange,
  size = "default",
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  size?: "default" | "lg"
}) {
  const [draft, setDraft] = useState("")
  const pillClass = size === "lg" ? PILL_BUTTON_CLASS_LG : PILL_BUTTON_CLASS
  const inputClass = size === "lg"
    ? "flex-1 min-w-0 h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs text-[var(--text)] bg-[var(--bg)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
    : "flex-1 min-w-0 h-9 rounded-full border border-[var(--border-strong)] px-4 text-xs text-[var(--text)] bg-[var(--bg)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
  const addBtnClass = size === "lg"
    ? "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
    : "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"

  const allTags = [...options, ...selected.filter((t) => !options.includes(t))]

  function toggle(tag: string) {
    onChange(
      selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]
    )
  }

  function addTag() {
    const name = draft.trim()
    if (!name) return
    if (name.length > MAX_TAG_LENGTH) return
    if (name.includes(",")) return
    if (selected.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setDraft("")
      return
    }
    const existing = options.find((o) => o.toLowerCase() === name.toLowerCase())
    onChange([...selected, existing ?? name])
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={pillClass}
            style={pillButtonStyle(selected.includes(tag))}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="新しいタグ"
          aria-label="新しいタグを追加"
          maxLength={MAX_TAG_LENGTH}
          className={inputClass}
          style={{ transition: "border-color 0.2s" }}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!draft.trim()}
          aria-label="タグを追加"
          className={addBtnClass}
          style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
