import type { Task } from "@/types/task"
import { StatusBadge } from "./StatusBadge"
import { PriorityBadge } from "./PriorityBadge"

function formatDue(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null
  const date = new Date(due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = date < today
  const label = date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
  return { label, overdue }
}

export function TaskItem({ task }: { task: Task }) {
  const due = formatDue(task.due)

  return (
    <a
      href={task.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {due && (
            <span className={`text-xs ${due.overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              {due.overdue ? "⚠ " : ""}{due.label}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {task.childTaskIds.length > 0 && (
            <span className="text-xs text-gray-400">
              子{task.childTaskIds.length}件
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
