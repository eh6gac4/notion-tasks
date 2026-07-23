"use client"

import { useState } from "react"
import { TaskFormSheet } from "./TaskFormSheet"

export function TaskCreate({ tagOptions, locationOptions }: { tagOptions: string[]; locationOptions: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-6 lg:bottom-6 lg:right-8 z-10 w-14 h-14 rounded-none flex items-center justify-center text-2xl transition-all active:scale-95 lg:hover:scale-110"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--bg)",
          boxShadow: "0 0 12px rgba(220,20,60,0.45), 0 4px 12px rgba(0,0,0,0.4)",
        }}
        aria-label="タスクを追加"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <TaskFormSheet open={open} onClose={() => setOpen(false)} tagOptions={tagOptions} locationOptions={locationOptions} />
    </>
  )
}
