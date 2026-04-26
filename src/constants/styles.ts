import type { TaskPriority, TaskStatus } from "@/types/task"

export const STATUS_OPTIONS: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止",
]

export const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "bg-[#160022] text-[#cc88ee] border border-[rgba(255,0,204,0.3)]",
  "進行中":       "bg-[#ff00cc] text-[#0d0014] border border-[#ff00cc] cyber-glow-sm",
  "確認中":       "bg-[#160022] text-[#ffcc00] border border-[rgba(255,204,0,0.4)]",
  "一時中断":     "bg-[#160022] text-[#ff6600] border border-[rgba(255,102,0,0.4)]",
  "完了":         "bg-[#160022] text-[#00ffcc] border border-[rgba(0,255,204,0.4)]",
  "中止":         "bg-[#160022] text-[#ff3355] border border-[rgba(255,51,85,0.4)]",
  "アーカイブ済み": "bg-[#0d0014] text-[#553355] border border-[rgba(85,0,85,0.3)]",
}

export const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: "🚨 High", color: "text-[#ff00cc] cyber-glow-text-sm" },
  medium: { label: "⚠️ Med",  color: "text-[#ffaa00]" },
  low:    { label: "💤 Low",  color: "text-[#00ffcc]" },
}
