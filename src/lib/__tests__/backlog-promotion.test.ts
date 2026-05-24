import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Task } from "@/types/task"

const { getTasks, updateTask } = vi.hoisted(() => ({
  getTasks: vi.fn(),
  updateTask: vi.fn(),
}))

vi.mock("@/lib/notion", () => ({ getTasks, updateTask }))

import { promoteBacklog } from "@/lib/backlog-promotion"

function makeTask(id: string, due: string | null): Task {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `task-${id}`,
    icon: null,
    status: "バックログ",
    priority: null,
    due,
    tags: [],
    assignees: [],
    source: null,
    sourceUrl: null,
    parentTaskIds: [],
    childTaskIds: [],
    prevTaskIds: [],
    nextTaskIds: [],
    createdTime: "2026-01-01T00:00:00.000Z",
    lastEditedTime: "2026-01-01T00:00:00.000Z",
  }
}

describe("promoteBacklog", () => {
  const now = new Date("2026-05-24T00:00:00.000Z")

  beforeEach(() => {
    getTasks.mockReset()
    updateTask.mockReset()
    updateTask.mockResolvedValue(undefined)
  })

  it("3 日以内 due は未着手に昇格させる", async () => {
    getTasks.mockResolvedValue([makeTask("a", "2026-05-26T00:00:00.000Z")])
    const result = await promoteBacklog(now)
    expect(updateTask).toHaveBeenCalledWith("a", { status: "未着手" })
    expect(result).toEqual({ promoted: 1, failed: 0 })
  })

  it("4 日以降 due は対象外", async () => {
    getTasks.mockResolvedValue([makeTask("b", "2026-05-29T00:00:00.000Z")])
    const result = await promoteBacklog(now)
    expect(updateTask).not.toHaveBeenCalled()
    expect(result).toEqual({ promoted: 0, failed: 0 })
  })

  it("due null は対象外 (締切のないバックログは触らない)", async () => {
    getTasks.mockResolvedValue([makeTask("c", null)])
    const result = await promoteBacklog(now)
    expect(updateTask).not.toHaveBeenCalled()
    expect(result).toEqual({ promoted: 0, failed: 0 })
  })

  it("過去 due (overdue) も拾って未着手に昇格させる", async () => {
    getTasks.mockResolvedValue([makeTask("d", "2026-04-01T00:00:00.000Z")])
    const result = await promoteBacklog(now)
    expect(updateTask).toHaveBeenCalledWith("d", { status: "未着手" })
    expect(result).toEqual({ promoted: 1, failed: 0 })
  })

  it("更新が一部失敗しても他は進行する", async () => {
    getTasks.mockResolvedValue([
      makeTask("e", "2026-05-25T00:00:00.000Z"),
      makeTask("f", "2026-05-26T00:00:00.000Z"),
    ])
    updateTask.mockImplementation((id: string) =>
      id === "e" ? Promise.reject(new Error("notion 5xx")) : Promise.resolve(undefined),
    )
    const result = await promoteBacklog(now)
    expect(updateTask).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ promoted: 1, failed: 1 })
  })
})
