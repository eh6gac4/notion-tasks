import type { TaskPriority, TaskStatus } from "@/types/task"

export const STATUS_OPTIONS: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止",
]

export const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "bg-[#1a0011] text-[#cc8899] border border-[rgba(220,20,60,0.3)]",
  "進行中":       "bg-[#dc143c] text-[#10000a] border border-[#dc143c] cyber-glow-sm",
  "確認中":       "bg-[#1a0011] text-[#ffcc00] border border-[rgba(255,204,0,0.4)]",
  "一時中断":     "bg-[#1a0011] text-[#ff6600] border border-[rgba(255,102,0,0.4)]",
  "完了":         "bg-[#1a0011] text-[#00ffcc] border border-[rgba(0,255,204,0.4)]",
  "中止":         "bg-[#1a0011] text-[#ff3355] border border-[rgba(255,51,85,0.4)]",
  "アーカイブ済み": "bg-[#10000a] text-[#553344] border border-[rgba(85,0,34,0.3)]",
}

export const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: "🚨 High", color: "text-[#dc143c] cyber-glow-text-sm" },
  medium: { label: "⚠️ Med",  color: "text-[#ffaa00]" },
  low:    { label: "💤 Low",  color: "text-[#00ffcc]" },
}

export const PILL_BUTTON_CLASS = "px-3 py-2 rounded-full text-xs transition-all"

export function pillButtonStyle(selected: boolean) {
  return selected
    ? { backgroundColor: "#dc143c", color: "#10000a", border: "1px solid transparent", boxShadow: "0 0 8px rgba(220,20,60,0.5)" }
    : { backgroundColor: "#10000a", color: "#996677", border: "1px solid rgba(220,20,60,0.2)" }
}
