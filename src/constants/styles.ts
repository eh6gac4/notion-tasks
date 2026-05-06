import type { TaskPriority, TaskStatus } from "@/types/task"

export const STATUS_OPTIONS: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止",
]

// セマンティック・ステータス: 「進行中」のみ accent + グローでサイバー DNA を残す。
// 他は意味色のみで表現し、視覚ノイズを抑える。
export const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "font-pixel bg-transparent text-[var(--status-todo)] border border-[var(--border-strong)]",
  "進行中":       "font-pixel bg-[var(--accent)] text-[var(--bg)] border border-[var(--accent)] accent-glow-sm",
  "確認中":       "font-pixel bg-transparent text-[var(--status-review)] border border-[rgba(245,158,11,0.45)]",
  "一時中断":     "font-pixel bg-transparent text-[var(--status-pause)] border border-[rgba(251,113,133,0.45)]",
  "完了":         "font-pixel bg-transparent text-[var(--status-done)] border border-[rgba(52,211,153,0.45)]",
  "中止":         "font-pixel bg-transparent text-[var(--status-cancel)] border border-[rgba(244,63,94,0.45)]",
  "アーカイブ済み": "font-pixel bg-transparent text-[var(--text-faint)] border border-[var(--border)]",
}

export const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: "🚨 High", color: "font-pixel text-[var(--accent)] font-semibold" },
  medium: { label: "⚠️ Med",  color: "font-pixel text-[var(--status-review)]" },
  low:    { label: "💤 Low",  color: "font-pixel text-[var(--status-done)]" },
}

export const PILL_BUTTON_CLASS = "px-3 py-2 rounded-full text-xs font-pixel transition-colors"

export function pillButtonStyle(selected: boolean) {
  return selected
    ? {
        backgroundColor: "var(--accent)",
        color: "var(--bg)",
        border: "1px solid transparent",
        boxShadow: "0 0 6px rgba(220,20,60,0.45)",
      }
    : {
        backgroundColor: "transparent",
        color: "var(--text-dim)",
        border: "1px solid var(--border-strong)",
      }
}
