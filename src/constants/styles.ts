import type { TaskPriority, TaskStatus } from "@/types/task"

export const STATUS_OPTIONS: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止",
]

export const STATUS_STYLES: Record<TaskStatus, string> = {
  "未着手":       "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "進行中":       "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "確認中":       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "一時中断":     "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "完了":         "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "中止":         "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
  "アーカイブ済み": "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
}

export const PRIORITY_STYLES: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: "↑ High", color: "text-red-500 dark:text-red-400" },
  medium: { label: "→ Med",  color: "text-yellow-500 dark:text-yellow-400" },
  low:    { label: "↓ Low",  color: "text-green-500 dark:text-green-400" },
}
