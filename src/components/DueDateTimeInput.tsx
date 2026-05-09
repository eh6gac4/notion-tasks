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
  // default: .field (44px、TaskCreate などの新規作成シート)
  // compact: .field-sm (36px、TaskDetail の省スペース)
  // webkit の <input type="date"> ネイティブ装飾は globals.css で抑制している。
  // appearance: none を当てるとネイティブのプレースホルダ (mm/dd/yyyy) が消えるため、
  // 値が空の間は absolute span で「日付」「時刻」のヒントを重ねている。
  const inputClass = size === "compact" ? "field-sm w-full" : "field w-full"
  const inputStyle = { colorScheme: "dark" as const }
  // .field の padding-left に揃える (default 16px / compact 12px)
  const placeholderClass = `pointer-events-none absolute inset-0 flex items-center text-sm text-[var(--text-faint)] ${
    size === "compact" ? "px-3" : "px-4"
  }`

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1 min-w-0">
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
        {!date && <span className={placeholderClass}>日付</span>}
      </div>
      <div className="relative flex-1 min-w-0">
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
        {!time && <span className={placeholderClass}>時刻</span>}
      </div>
    </div>
  )
}
