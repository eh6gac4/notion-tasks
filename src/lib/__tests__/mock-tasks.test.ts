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

describe("createMockTask の前後タスクリレーション", () => {
  beforeEach(() => {
    resetMockTasks()
  })

  it("nextTaskId 指定時に新タスクの nextTaskIds に対象が入る", () => {
    const created = createMockTask({ title: "前タスク", nextTaskId: "mock-2" })
    expect(created.nextTaskIds).toEqual(["mock-2"])
  })

  it("nextTaskId 指定時に対象タスクの prevTaskIds に新 ID が追加される", () => {
    const created = createMockTask({ title: "前タスク", nextTaskId: "mock-2" })
    const next = getMockTask("mock-2")
    expect(next?.prevTaskIds).toContain(created.id)
  })

  it("prevTaskId 指定時に新タスクの prevTaskIds に対象が入る", () => {
    const created = createMockTask({ title: "次タスク", prevTaskId: "mock-2" })
    expect(created.prevTaskIds).toEqual(["mock-2"])
  })

  it("prevTaskId 指定時に対象タスクの nextTaskIds に新 ID が追加される", () => {
    const created = createMockTask({ title: "次タスク", prevTaskId: "mock-2" })
    const prev = getMockTask("mock-2")
    expect(prev?.nextTaskIds).toContain(created.id)
  })

  it("存在しない前後タスク ID を指定しても例外を投げない", () => {
    expect(() => createMockTask({ title: "孤立", prevTaskId: "does-not-exist", nextTaskId: "does-not-exist-2" })).not.toThrow()
  })
})
