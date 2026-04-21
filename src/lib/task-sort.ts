import type { Task, TaskStatus } from "@/types/task"

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

export const STATUS_ORDER: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止", "アーカイブ済み",
]

export function sortByPriorityAndDue(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = a.priority != null ? PRIORITY_ORDER[a.priority] : 3
    const pb = b.priority != null ? PRIORITY_ORDER[b.priority] : 3
    if (pa !== pb) return pa - pb
    if (!a.due && !b.due) return 0
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due.localeCompare(b.due)
  })
}

export function groupAndSort(tasks: Task[]): { status: TaskStatus; tasks: Task[] }[] {
  const map = new Map<TaskStatus, Task[]>()
  for (const task of tasks) {
    if (!task.status) continue
    if (!map.has(task.status)) map.set(task.status, [])
    map.get(task.status)!.push(task)
  }
  return STATUS_ORDER
    .filter((s) => map.has(s))
    .map((s) => ({ status: s, tasks: sortByPriorityAndDue(map.get(s)!) }))
}
