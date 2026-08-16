import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useTaskLookup } from "../useTaskLookup"
import type { Task } from "@/types/task"

const getTasksByIdsAction = vi.fn()
vi.mock("@/app/actions", () => ({
  getTasksByIdsAction: (...args: unknown[]) => getTasksByIdsAction(...args),
}))

beforeEach(() => {
  getTasksByIdsAction.mockReset()
})

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

describe("useTaskLookup", () => {
  it("baseTasks に含まれる id はそのまま解決できる", () => {
    const base = [makeTask({ id: "a", title: "A" })]
    const { result } = renderHook(() => useTaskLookup(base, ["a"]))
    expect(result.current.get("a")?.title).toBe("A")
  })

  it("baseTasks に無い id は getTasksByIdsAction で補完取得する", async () => {
    getTasksByIdsAction.mockResolvedValueOnce([makeTask({ id: "b", title: "B" })])
    const base: Task[] = []
    const { result } = renderHook(() => useTaskLookup(base, ["b"]))

    await waitFor(() => expect(result.current.get("b")?.title).toBe("B"))
    expect(getTasksByIdsAction).toHaveBeenCalledWith(["b"])
  })

  it("見つからなかった id は再取得を試みない", async () => {
    getTasksByIdsAction.mockResolvedValueOnce([])
    const base: Task[] = []
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useTaskLookup(base, ids),
      { initialProps: { ids: ["missing"] } }
    )

    await waitFor(() => expect(getTasksByIdsAction).toHaveBeenCalledTimes(1))
    expect(result.current.has("missing")).toBe(false)

    rerender({ ids: ["missing"] })
    await new Promise((r) => setTimeout(r, 0))
    expect(getTasksByIdsAction).toHaveBeenCalledTimes(1)
  })
})
