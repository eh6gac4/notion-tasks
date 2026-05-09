"use client"

import { snapTimeTo5Min } from "@/lib/due-date"

type Size = "default" | "compact"

export function DueDateTimeInput({
  date,
  time,
  onChange,
  size = "default",
}: {
  date: string
  time: string
  onChange: (date: string, time: string) => void
  size?: Size
}) {
  // default: field (44px 高 / 16px padding) を継承
  // compact: TaskDetail Row 内など省スペース用に高さを 36px へ
  const inputClass = size === "compact"
    ? "rounded-lg px-3 h-9 text-sm text-[var(--text)] bg-[var(--bg)] border border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-40"
    : "field"
  const inputStyle = { colorScheme: "dark" as const }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="date"
        value={date}
        onChange={(e) => {
          const nextDate = e.target.value
          onChange(nextDate, nextDate ? time : "")
        }}
        className={inputClass}
        style={inputStyle}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => onChange(date, snapTimeTo5Min(e.target.value))}
        disabled={!date}
        step={300}
        aria-label="期限の時刻"
        className={inputClass}
        style={inputStyle}
      />
    </div>
  )
}
