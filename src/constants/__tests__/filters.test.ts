import { describe, it, expect } from "vitest"
import type { AdvancedFilter, Task } from "@/types/task"
import { applyAdvancedFilter, isAdvancedFilterActive, parseAdvancedFilter, DEFAULT_ADVANCED_FILTER } from "@/constants/filters"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t",
    url: "https://notion.so/t",
    title: "title",
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
    createdTime: "2024-01-01T00:00:00.000Z",
    lastEditedTime: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

const NONE: AdvancedFilter = DEFAULT_ADVANCED_FILTER

describe("applyAdvancedFilter — タグ OR", () => {
  const tasks = [
    makeTask({ id: "1", tags: ["Tech"] }),
    makeTask({ id: "2", tags: ["Blog"] }),
    makeTask({ id: "3", tags: ["Tech", "Blog"] }),
    makeTask({ id: "4", tags: [] }),
  ]

  it("単一タグの選択でそのタグを持つタスクが残る", () => {
    const result = applyAdvancedFilter(tasks, { ...NONE, tags: ["Tech"] })
    expect(result.map((t) => t.id)).toEqual(["1", "3"])
  })

  it("複数タグは OR で結合される", () => {
    const result = applyAdvancedFilter(tasks, { ...NONE, tags: ["Tech", "Blog"] })
    expect(result.map((t) => t.id)).toEqual(["1", "2", "3"])
  })

  it("タグ空配列はフィルタ非適用", () => {
    expect(applyAdvancedFilter(tasks, NONE)).toHaveLength(4)
  })
})

describe("applyAdvancedFilter — 期限", () => {
  const past = "2000-01-01"
  const future = new Date(Date.now() + 86400_000 * 30).toISOString()
  const tasks = [
    makeTask({ id: "p", due: past }),
    makeTask({ id: "f", due: future }),
    makeTask({ id: "n", due: null }),
  ]

  it("any はすべて返す", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, dueDate: "any" })).toHaveLength(3)
  })
  it("with は due ありのみ", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, dueDate: "with" }).map((t) => t.id)).toEqual(["p", "f"])
  })
  it("without は due なしのみ", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, dueDate: "without" }).map((t) => t.id)).toEqual(["n"])
  })
  it("overdue は過去 due のみ", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, dueDate: "overdue" }).map((t) => t.id)).toEqual(["p"])
  })
})

describe("applyAdvancedFilter — 優先度 OR", () => {
  const tasks = [
    makeTask({ id: "h", priority: "high" }),
    makeTask({ id: "m", priority: "medium" }),
    makeTask({ id: "l", priority: "low" }),
    makeTask({ id: "z", priority: null }),
  ]

  it("空配列はフィルタ非適用", () => {
    expect(applyAdvancedFilter(tasks, NONE)).toHaveLength(4)
  })
  it("単一の優先度", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, priorities: ["high"] }).map((t) => t.id)).toEqual(["h"])
  })
  it("複数の優先度は OR", () => {
    expect(applyAdvancedFilter(tasks, { ...NONE, priorities: ["high", "low"] }).map((t) => t.id)).toEqual(["h", "l"])
  })
  it("priority が null のタスクは優先度フィルタ指定時に除外される", () => {
    const result = applyAdvancedFilter(tasks, { ...NONE, priorities: ["high", "medium", "low"] })
    expect(result.map((t) => t.id)).not.toContain("z")
  })
})

describe("applyAdvancedFilter — 複合 AND", () => {
  it("タグ・期限・優先度の組合せが AND で適用される", () => {
    const tasks = [
      makeTask({ id: "1", tags: ["Tech"], priority: "high",   due: "2026-12-31" }),
      makeTask({ id: "2", tags: ["Tech"], priority: "low",    due: "2026-12-31" }),
      makeTask({ id: "3", tags: ["Blog"], priority: "high",   due: null         }),
      makeTask({ id: "4", tags: ["Tech"], priority: "high",   due: null         }),
    ]
    const result = applyAdvancedFilter(tasks, {
      tags: ["Tech"],
      dueDate: "with",
      priorities: ["high"],
    })
    expect(result.map((t) => t.id)).toEqual(["1"])
  })
})

describe("isAdvancedFilterActive", () => {
  it("デフォルトは false", () => {
    expect(isAdvancedFilterActive(DEFAULT_ADVANCED_FILTER)).toBe(false)
  })
  it("タグが入っていれば true", () => {
    expect(isAdvancedFilterActive({ ...DEFAULT_ADVANCED_FILTER, tags: ["X"] })).toBe(true)
  })
  it("期限がデフォルト以外なら true", () => {
    expect(isAdvancedFilterActive({ ...DEFAULT_ADVANCED_FILTER, dueDate: "with" })).toBe(true)
  })
  it("優先度が入っていれば true", () => {
    expect(isAdvancedFilterActive({ ...DEFAULT_ADVANCED_FILTER, priorities: ["high"] })).toBe(true)
  })
})

describe("parseAdvancedFilter — 型ガード", () => {
  it("null/undefined はデフォルト", () => {
    expect(parseAdvancedFilter(null)).toEqual(DEFAULT_ADVANCED_FILTER)
    expect(parseAdvancedFilter(undefined)).toEqual(DEFAULT_ADVANCED_FILTER)
  })
  it("不正な dueDate はデフォルトの any にフォールバック", () => {
    expect(parseAdvancedFilter({ tags: [], dueDate: "garbage", priorities: [] }).dueDate).toBe("any")
  })
  it("不正な優先度値は除外される", () => {
    const result = parseAdvancedFilter({ tags: ["X"], dueDate: "with", priorities: ["high", "garbage"] })
    expect(result.priorities).toEqual(["high"])
    expect(result.tags).toEqual(["X"])
    expect(result.dueDate).toBe("with")
  })
  it("string 以外のタグは除外される", () => {
    const result = parseAdvancedFilter({ tags: ["A", 42, null, "B"], dueDate: "any", priorities: [] })
    expect(result.tags).toEqual(["A", "B"])
  })
  it("tags が配列でなければ空配列", () => {
    expect(parseAdvancedFilter({ tags: "not-array", dueDate: "any", priorities: [] }).tags).toEqual([])
  })
})
