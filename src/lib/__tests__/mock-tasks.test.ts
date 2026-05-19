import { describe, it, expect, beforeEach } from "vitest"
import { resetMockTasks, createMockTask, getMockTask } from "@/lib/mock-tasks"

describe("createMockTask の親子リレーション", () => {
  beforeEach(() => {
    resetMockTasks()
  })

  it("parentTaskId 指定時に新タスクの parentTaskIds に親が入る", () => {
    const child = createMockTask({ title: "子", parentTaskId: "mock-2" })
    expect(child.parentTaskIds).toEqual(["mock-2"])
  })

  it("parentTaskId 指定時に親タスクの childTaskIds に新 ID が追加される", () => {
    const child = createMockTask({ title: "子", parentTaskId: "mock-2" })
    const parent = getMockTask("mock-2")
    expect(parent?.childTaskIds).toContain(child.id)
  })

  it("parentTaskId 未指定では既存タスクの childTaskIds を変更しない", () => {
    const before = [...(getMockTask("mock-2")?.childTaskIds ?? [])]
    createMockTask({ title: "無関係タスク" })
    expect(getMockTask("mock-2")?.childTaskIds).toEqual(before)
  })

  it("存在しない親 ID を指定しても例外を投げない", () => {
    expect(() => createMockTask({ title: "孤児", parentTaskId: "does-not-exist" })).not.toThrow()
  })
})
