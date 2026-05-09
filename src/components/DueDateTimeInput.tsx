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
  const inputClass = size === "compact" ? "field-sm" : "field"
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
