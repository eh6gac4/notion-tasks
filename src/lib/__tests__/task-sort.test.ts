import { describe, it, expect } from "vitest"
import {
  applySort,
  DEFAULT_SORT,
  isSortActive,
  parseSortConfig,
  sortByPriorityAndDue,
} from "@/lib/task-sort"
import type { SortConfig, Task } from "@/types/task"

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "task",
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

describe("isSortActive", () => {
  it("default は非アクティブ", () => {
    expect(isSortActive({ key: "default", direction: "asc" })).toBe(false)
    expect(isSortActive(DEFAULT_SORT)).toBe(false)
  })
  it("default 以外はアクティブ", () => {
    expect(isSortActive({ key: "due", direction: "asc" })).toBe(true)
    expect(isSortActive({ key: "priority", direction: "desc" })).toBe(true)
  })
})

describe("parseSortConfig", () => {
  it("null/undefined はデフォルト", () => {
    expect(parseSortConfig(null)).toEqual(DEFAULT_SORT)
    expect(parseSortConfig(undefined)).toEqual(DEFAULT_SORT)
  })
  it("不正な型はデフォルトにフォールバック", () => {
    expect(parseSortConfig("not-an-object")).toEqual(DEFAULT_SORT)
    expect(parseSortConfig(123)).toEqual(DEFAULT_SORT)
  })
  it("不正な key/direction は安全側にフォールバック", () => {
    expect(parseSortConfig({ key: "bogus", direction: "asc" })).toEqual(DEFAULT_SORT)
    expect(parseSortConfig({ key: "due", direction: "weird" })).toEqual({ key: "due", direction: "asc" })
  })
  it("正常値はそのまま返る", () => {
    expect(parseSortConfig({ key: "priority", direction: "desc" })).toEqual({ key: "priority", direction: "desc" })
  })
})

describe("applySort: default", () => {
  it("default は sortByPriorityAndDue と一致", () => {
    const tasks = [
      makeTask({ id: "a", priority: "low",  due: "2024-03-01" }),
      makeTask({ id: "b", priority: "high", due: "2024-04-01" }),
      makeTask({ id: "c", priority: null,   due: "2024-02-01" }),
      makeTask({ id: "d", priority: "high", due: "2024-01-01" }),
    ]
    const expected = sortByPriorityAndDue(tasks).map((t) => t.id)
    expect(applySort(tasks, DEFAULT_SORT).map((t) => t.id)).toEqual(expected)
  })
})

describe("applySort: due", () => {
  const tasks = [
    makeTask({ id: "a", due: "2024-03-01" }),
    makeTask({ id: "b", due: null }),
    makeTask({ id: "c", due: "2024-01-15" }),
    makeTask({ id: "d", due: "2024-05-10" }),
  ]

  it("昇順: 古い→新しい、null は末尾", () => {
    const ids = applySort(tasks, { key: "due", direction: "asc" }).map((t) => t.id)
    expect(ids).toEqual(["c", "a", "d", "b"])
  })

  it("降順: 新しい→古い、null は末尾", () => {
    const ids = applySort(tasks, { key: "due", direction: "desc" }).map((t) => t.id)
    expect(ids).toEqual(["d", "a", "c", "b"])
  })

  it("null のみでも安全に返る", () => {
    const onlyNull = [makeTask({ id: "x", due: null }), makeTask({ id: "y", due: null })]
    const ids = applySort(onlyNull, { key: "due", direction: "asc" }).map((t) => t.id)
    expect(ids).toEqual(["x", "y"])
  })

  it("元配列を破壊しない", () => {
    const before = tasks.map((t) => t.id)
    applySort(tasks, { key: "due", direction: "desc" })
    expect(tasks.map((t) => t.id)).toEqual(before)
  })
})

describe("applySort: priority", () => {
  const tasks = [
    makeTask({ id: "a", priority: "medium" }),
    makeTask({ id: "b", priority: null }),
    makeTask({ id: "c", priority: "high" }),
    makeTask({ id: "d", priority: "low" }),
  ]

  it("昇順: high → medium → low、null は末尾", () => {
    const ids = applySort(tasks, { key: "priority", direction: "asc" }).map((t) => t.id)
    expect(ids).toEqual(["c", "a", "d", "b"])
  })

  it("降順: low → medium → high、null は末尾", () => {
    const ids = applySort(tasks, { key: "priority", direction: "desc" }).map((t) => t.id)
    expect(ids).toEqual(["d", "a", "c", "b"])
  })
})
