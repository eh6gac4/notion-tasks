import type { SortConfig, SortDirection, SortKey, Task, TaskStatus } from "@/types/task"

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

export const STATUS_ORDER: TaskStatus[] = [
  "未着手", "進行中", "確認中", "一時中断", "完了", "中止", "アーカイブ済み",
]

export const DEFAULT_SORT: SortConfig = { key: "default", direction: "asc" }

const SORT_KEYS: readonly SortKey[] = ["default", "due", "priority"]
const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"]

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

export function isSortActive(sort: SortConfig): boolean {
  return sort.key !== "default"
}

/** 不正値や古いスキーマで落ちないよう各フィールドを検証 */
export function parseSortConfig(raw: unknown): SortConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_SORT
  const obj = raw as Record<string, unknown>
  const key = SORT_KEYS.includes(obj.key as SortKey) ? (obj.key as SortKey) : "default"
  const direction = SORT_DIRECTIONS.includes(obj.direction as SortDirection)
    ? (obj.direction as SortDirection)
    : "asc"
  return { key, direction }
}

export function applySort(tasks: Task[], sort: SortConfig): Task[] {
  if (sort.key === "default") return sortByPriorityAndDue(tasks)
  const sign = sort.direction === "asc" ? 1 : -1
  if (sort.key === "due") {
    return [...tasks].sort((a, b) => {
      if (!a.due && !b.due) return 0
      if (!a.due) return 1
      if (!b.due) return -1
      return a.due.localeCompare(b.due) * sign
    })
  }
  // priority
  return [...tasks].sort((a, b) => {
    const pa = a.priority != null ? PRIORITY_ORDER[a.priority] : 3
    const pb = b.priority != null ? PRIORITY_ORDER[b.priority] : 3
    if (pa === 3 && pb === 3) return 0
    if (pa === 3) return 1
    if (pb === 3) return -1
    return (pa - pb) * sign
  })
}
