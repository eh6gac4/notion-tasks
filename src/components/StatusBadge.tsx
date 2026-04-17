import type { TaskStatus } from "@/types/task"

const statusStyles: Record<TaskStatus, string> = {
  "未着手": "bg-gray-100 text-gray-600",
  "進行中": "bg-blue-100 text-blue-700",
  "確認中": "bg-yellow-100 text-yellow-700",
  "一時中断": "bg-orange-100 text-orange-700",
  "完了": "bg-green-100 text-green-700",
  "中止": "bg-red-100 text-red-600",
  "アーカイブ済み": "bg-gray-100 text-gray-400",
}

export function StatusBadge({ status }: { status: TaskStatus | null }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  )
}
