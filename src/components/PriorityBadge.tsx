import type { TaskPriority } from "@/types/task"

const priorityStyles: Record<TaskPriority, string> = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-green-500",
}

const priorityLabels: Record<TaskPriority, string> = {
  high: "↑ High",
  medium: "→ Med",
  low: "↓ Low",
}

export function PriorityBadge({ priority }: { priority: TaskPriority | null }) {
  if (!priority) return null
  return (
    <span className={`text-xs font-medium ${priorityStyles[priority]}`}>
      {priorityLabels[priority]}
    </span>
  )
}
