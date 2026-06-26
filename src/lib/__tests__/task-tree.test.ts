import { describe, it, expect } from "vitest"
import { buildNestedOrder } from "@/lib/task-tree"
import type { Task } from "@/types/task"

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "task",
    icon: null,
    status: "未着手",
    priority: null,
    due: null,
    tags: [],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    attachments: [],
    createdTime: "2024-01-01T00:00:00.000Z",
    lastEditedTime: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("buildNestedOrder", () => {
  it("親の直後に子を depth+1 で並べる", () => {
    const parent = makeTask({ id: "p" })
    const child = makeTask({ id: "c", parentTaskIds: ["p"] })
    const result = buildNestedOrder([parent, child])
    expect(result.map((n) => [n.task.id, n.depth])).toEqual([
      ["p", 0],
      ["c", 1],
    ])
  })

  it("子が親より前に来ても親の下にまとめる", () => {
    const child = makeTask({ id: "c", parentTaskIds: ["p"] })
    const parent = makeTask({ id: "p" })
    const result = buildNestedOrder([child, parent])
    expect(result.map((n) => n.task.id)).toEqual(["p", "c"])
  })

  it("親が同じ列に居なければ子はルート (depth 0) のまま残す", () => {
    const child = makeTask({ id: "c", parentTaskIds: ["missing"] })
    const result = buildNestedOrder([child])
    expect(result).toEqual([{ task: child, depth: 0 }])
  })

  it("孫まで再帰的にネストする", () => {
    const p = makeTask({ id: "p" })
    const c = makeTask({ id: "c", parentTaskIds: ["p"] })
    const g = makeTask({ id: "g", parentTaskIds: ["c"] })
    const result = buildNestedOrder([p, c, g])
    expect(result.map((n) => [n.task.id, n.depth])).toEqual([
      ["p", 0],
      ["c", 1],
      ["g", 2],
    ])
  })

  it("兄弟は入力順を維持する", () => {
    const p = makeTask({ id: "p" })
    const c1 = makeTask({ id: "c1", parentTaskIds: ["p"] })
    const c2 = makeTask({ id: "c2", parentTaskIds: ["p"] })
    const result = buildNestedOrder([p, c1, c2])
    expect(result.map((n) => n.task.id)).toEqual(["p", "c1", "c2"])
  })

  it("循環参照でも全タスクを 1 度ずつ返す", () => {
    const a = makeTask({ id: "a", parentTaskIds: ["b"] })
    const b = makeTask({ id: "b", parentTaskIds: ["a"] })
    const result = buildNestedOrder([a, b])
    expect(result).toHaveLength(2)
    expect(new Set(result.map((n) => n.task.id))).toEqual(new Set(["a", "b"]))
  })

  it("自己参照は無視する", () => {
    const a = makeTask({ id: "a", parentTaskIds: ["a"] })
    const result = buildNestedOrder([a])
    expect(result).toEqual([{ task: a, depth: 0 }])
  })
})
