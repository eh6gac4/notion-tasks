import type { Task } from "@/types/task"

export type NestedTaskNode = { task: Task; depth: number }

// カラム内のタスク列 (フィルタ/ソート済み) を、サブタスクが親タスクの直下に
// インデント表示されるよう並べ替える。
//
// - 親が「同じカラムの可視リストに存在する」場合のみネストする。親が別カラム
//   (別ステータス) や、フィルタ・検索で除外されている場合、その子はルートとして
//   そのまま表示する (= タスクが一覧から消えない)。
// - ルートの並び順、および同じ親を持つ兄弟の並び順は、入力 `tasks` の順序
//   (= applySort の結果) をそのまま維持する。
// - 循環参照や、入力に出現しない親 ID は安全に無視する。
export function buildNestedOrder(tasks: Task[]): NestedTaskNode[] {
  const byId = new Map<string, Task>()
  tasks.forEach((t) => byId.set(t.id, t))

  // 各タスクの「このカラム内に存在する親」を 1 つ決める。
  const parentOf = new Map<string, string>()
  for (const t of tasks) {
    const p = t.parentTaskIds.find((pid) => pid !== t.id && byId.has(pid))
    if (p) parentOf.set(t.id, p)
  }

  const childrenOf = new Map<string, Task[]>()
  for (const t of tasks) {
    const p = parentOf.get(t.id)
    if (p === undefined) continue
    if (!childrenOf.has(p)) childrenOf.set(p, [])
    childrenOf.get(p)!.push(t)
  }

  const out: NestedTaskNode[] = []
  const visited = new Set<string>()

  function walk(task: Task, depth: number) {
    if (visited.has(task.id)) return
    visited.add(task.id)
    out.push({ task, depth })
    for (const c of childrenOf.get(task.id) ?? []) walk(c, depth + 1)
  }

  for (const t of tasks) {
    if (parentOf.has(t.id)) continue // 子は親側から辿る
    walk(t, 0)
  }
  // 循環で root から辿れなかったタスクの取りこぼし防止。
  for (const t of tasks) if (!visited.has(t.id)) walk(t, 0)

  return out
}

// collapsed な親タスクの子孫を nested リストから除去する。
// nested は DFS 順なので、depth が増えている連続区間が子孫に対応する。
export function filterCollapsed(
  nested: NestedTaskNode[],
  collapsedParents: Set<string>
): NestedTaskNode[] {
  const result: NestedTaskNode[] = []
  let skipAboveDepth: number | null = null

  for (const node of nested) {
    if (skipAboveDepth !== null) {
      if (node.depth > skipAboveDepth) continue
      skipAboveDepth = null
    }
    result.push(node)
    if (collapsedParents.has(node.task.id)) {
      skipAboveDepth = node.depth
    }
  }
  return result
}
