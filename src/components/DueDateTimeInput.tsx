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

  // モバイル (iOS Safari の wheel picker など) ではネイティブ <input type="date">
  // から値を空に戻す手段が露出していないため、明示的なクリアボタンを置く。
  // date が無い時は同時に time も無効になるので表示しない。
  const clearBtnClass = size === "compact" ? "icon-btn-sm" : "icon-btn"

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
      {date && (
        <button
          type="button"
          onClick={() => onChange("", "")}
          aria-label="期限をクリア"
          data-testid="due-clear-button"
          className={clearBtnClass}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
