import { describe, it, expect } from "vitest"
import { buildRelationMap } from "@/lib/task-relation"
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
    location: null,
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

describe("buildRelationMap", () => {
  it("未選択のときは空 Map", () => {
    const map = buildRelationMap(null)
    expect(map.size).toBe(0)
  })

  it("prev/next がそれぞれ正しい関係に写る", () => {
    const selected = makeTask({ id: "b", prevTaskIds: ["a"], nextTaskIds: ["c"] })
    const map = buildRelationMap(selected)
    expect(map.get("a")).toBe("prev")
    expect(map.get("c")).toBe("next")
  })

  it("選択タスク自身は selected になる", () => {
    const selected = makeTask({ id: "b", prevTaskIds: ["a"], nextTaskIds: ["c"] })
    const map = buildRelationMap(selected)
    expect(map.get("b")).toBe("selected")
  })

  it("prev と next の両方に同じ id があれば prev が勝つ", () => {
    const selected = makeTask({ id: "b", prevTaskIds: ["a"], nextTaskIds: ["a"] })
    const map = buildRelationMap(selected)
    expect(map.get("a")).toBe("prev")
  })

  it("prevTaskIds/nextTaskIds が空でも壊れない", () => {
    const selected = makeTask({ id: "b" })
    const map = buildRelationMap(selected)
    expect(map.size).toBe(1)
    expect(map.get("b")).toBe("selected")
  })

  it("複数件の prev/next も網羅する", () => {
    const selected = makeTask({ id: "c", prevTaskIds: ["a", "b"], nextTaskIds: ["d", "e"] })
    const map = buildRelationMap(selected)
    expect(map.get("a")).toBe("prev")
    expect(map.get("b")).toBe("prev")
    expect(map.get("d")).toBe("next")
    expect(map.get("e")).toBe("next")
    expect(map.size).toBe(5)
  })
})
