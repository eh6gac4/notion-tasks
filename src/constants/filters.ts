import type { TaskStatus } from "@/types/task"

export const FILTERS: { label: string; key: string; statuses: TaskStatus[] | null }[] = [
  { label: "進行中・未着手", key: "active", statuses: ["進行中", "未着手"] },
  { label: "未着手",         key: "todo",   statuses: ["未着手"] },
  { label: "進行中",         key: "doing",  statuses: ["進行中"] },
  { label: "確認中",         key: "review", statuses: ["確認中"] },
  { label: "一時中断",       key: "paused", statuses: ["一時中断"] },
  { label: "すべて",         key: "all",    statuses: null },
]

const ALL_STATUSES: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]

/** フィルターキーから Notion API に渡すステータス一覧を返す */
export function getQueryStatuses(filterKey: string): TaskStatus[] {
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  return filter.statuses ?? ALL_STATUSES
}
