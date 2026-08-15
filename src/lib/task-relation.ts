import type { Task } from "@/types/task"

export type TaskRelation = "selected" | "prev" | "next"

/**
 * 選択中タスクを基準に、id → 関係 のマップを返す。
 * - 選択タスク自身: "selected"
 * - prevTaskIds に含まれる id: "prev"
 * - nextTaskIds に含まれる id: "next"
 * 同一 id が prev/next 双方に含まれる (不整合データ) 場合は prev を優先する。
 * 未選択 (selected が null) の場合は空 Map を返す。
 */
export function buildRelationMap(selected: Task | null): Map<string, TaskRelation> {
  const map = new Map<string, TaskRelation>()
  if (!selected) return map

  for (const id of selected.nextTaskIds) {
    map.set(id, "next")
  }
  for (const id of selected.prevTaskIds) {
    map.set(id, "prev")
  }
  map.set(selected.id, "selected")

  return map
}
