"use client"

import { useEffect, useState } from "react"
import { useSettings } from "./SettingsContext"

export function Settings() {
  const [open, setOpen] = useState(false)
  const { settings, update } = useSettings()

  // シート開閉時に背景スクロールを抑制
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <button
        type="button"
        data-testid="settings-button"
        onClick={() => setOpen(true)}
        aria-label="設定を開く"
        className="text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors flex items-center"
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
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div data-testid="settings-sheet" className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />

          <div
            className="relative rounded-t-2xl px-5 pt-4 pb-10 safe-bottom max-h-[85svh] overflow-y-auto"
            style={{
              backgroundColor: "var(--surface)",
              borderTop: "1px solid var(--border-strong)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <button onClick={() => setOpen(false)} className="w-full flex justify-center pb-2 -mt-1" aria-label="閉じる">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border-strong)" }} />
            </button>

            <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-5 accent-glow-text-sm">
              ✦ Settings
            </h2>

            <div className="flex items-center justify-between py-3 border-t border-[var(--border)]">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[var(--text)]">デバッグ表示</span>
                <span className="text-xs text-[var(--text-faint)]">バージョン情報・リクエストログを画面下部に表示</span>
              </div>
              <button
                type="button"
                data-testid="debug-visible-toggle"
                role="switch"
                aria-checked={settings.debugVisible}
                aria-label="デバッグ表示の切り替え"
                onClick={() => update({ debugVisible: !settings.debugVisible })}
                className="flex-shrink-0 relative w-12 h-6 rounded-full transition-colors"
                style={{
                  backgroundColor: settings.debugVisible ? "var(--accent)" : "var(--surface-2)",
                  boxShadow: settings.debugVisible ? "0 0 8px rgba(220,20,60,0.4)" : "inset 0 0 0 1px var(--border-strong)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
                  style={{
                    backgroundColor: settings.debugVisible ? "#fff" : "var(--text-dim)",
                    transform: settings.debugVisible ? "translateX(24px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
