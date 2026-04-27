"use client"

import { snapTimeTo5Min } from "@/lib/due-date"

type Size = "default" | "compact"

const VERTICAL_PADDING: Record<Size, string> = {
  default: "py-3",
  compact: "py-2",
}

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
  const inputClass = `rounded-xl px-3 ${VERTICAL_PADDING[size]} text-sm text-[#ffbbee] bg-[#0d0014] focus:outline-none disabled:opacity-40`
  const inputStyle = { border: "1px solid rgba(255,0,204,0.3)", colorScheme: "dark" as const }

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
