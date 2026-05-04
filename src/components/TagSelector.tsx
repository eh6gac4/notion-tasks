"use client"

import { useState } from "react"
import { PILL_BUTTON_CLASS, pillButtonStyle } from "@/constants/styles"

const MAX_TAG_LENGTH = 100

export function TagSelector({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState("")

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
            className={PILL_BUTTON_CLASS}
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
          className="flex-1 min-w-0 rounded-full border border-[rgba(220,20,60,0.3)] px-4 py-2 text-xs text-[#ffbbcc] bg-[#10000a] placeholder:text-[#553344] focus:outline-none focus:border-[#dc143c]"
          style={{ transition: "border-color 0.2s" }}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!draft.trim()}
          aria-label="タグを追加"
          className="px-4 py-2 rounded-full text-xs transition-all disabled:opacity-40"
          style={{ backgroundColor: "#dc143c", color: "#10000a" }}
        >
          +
        </button>
      </div>
    </div>
  )
}
