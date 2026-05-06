import type { AdvancedFilter, DueDateMode, Task, TaskPriority } from "@/types/task"
import { isOverdue } from "@/lib/due-date"

export const DEFAULT_ADVANCED_FILTER: AdvancedFilter = {
  tags: [],
  dueDate: "any",
  priorities: [],
}

const DUE_MODES: readonly DueDateMode[] = ["any", "with", "overdue", "without"]
const PRIORITIES: readonly TaskPriority[] = ["high", "medium", "low"]

/** 不正値や古いスキーマで落ちないよう各フィールドを検証 */
export function parseAdvancedFilter(raw: unknown): AdvancedFilter {
  if (!raw || typeof raw !== "object") return DEFAULT_ADVANCED_FILTER
  const obj = raw as Record<string, unknown>
  const tags = Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : []
  const dueDate = DUE_MODES.includes(obj.dueDate as DueDateMode) ? (obj.dueDate as DueDateMode) : "any"
  const priorities = Array.isArray(obj.priorities)
    ? obj.priorities.filter((p): p is TaskPriority => PRIORITIES.includes(p as TaskPriority))
    : []
  return { tags, dueDate, priorities }
}

/** デフォルトと差分があるか（インジケータ表示用） */
export function isAdvancedFilterActive(filter: AdvancedFilter): boolean {
  return filter.tags.length > 0 || filter.dueDate !== "any" || filter.priorities.length > 0
}

/** タスク配列に追加次元（タグ/期限/優先度）を AND で重畳する */
export function applyAdvancedFilter(tasks: Task[], filter: AdvancedFilter): Task[] {
  return tasks.filter((task) => {
    if (filter.tags.length > 0 && !filter.tags.some((t) => task.tags.includes(t))) return false

    if (filter.dueDate === "with" && !task.due) return false
    if (filter.dueDate === "without" && task.due) return false
    if (filter.dueDate === "overdue" && !isOverdue(task.due)) return false

    if (filter.priorities.length > 0) {
      if (!task.priority || !filter.priorities.includes(task.priority)) return false
    }

    return true
  })
}
