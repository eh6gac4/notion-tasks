import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { BoardColumn } from "@/components/BoardColumn"
import { DEFAULT_SORT } from "@/lib/task-sort"
import type { Task } from "@/types/task"
import { getBacklogTasksAction } from "@/app/actions"

vi.mock("@/app/actions", () => ({
  getCompletedTasksAction: vi.fn().mockResolvedValue([]),
  getCancelledTasksAction: vi.fn().mockResolvedValue([]),
  getSkipTasksAction: vi.fn().mockResolvedValue([]),
  getBacklogTasksAction: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/components/TaskItem", () => ({
  TaskItem: ({ task }: { task: Task }) => <div data-testid="task-item">{task.title}</div>,
}))

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "タスク",
    icon: null,
    status: "バックログ",
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

const NONE = { tags: [], dueDate: "any" as const, priorities: [] }

// 監視開始と同時に交差扱いにして lazy fetch を発火させる
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe() {
        this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
      }
      disconnect() {}
      unobserve() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function renderColumn(refreshToken: number) {
  return render(
    <BoardColumn
      columnKey="backlog"
      title="バックログ"
      statuses={["バックログ"]}
      accentStatus="バックログ"
      tasks={[]}
      searchQuery=""
      advancedFilter={NONE}
      sort={DEFAULT_SORT}
      refreshToken={refreshToken}
      onSelect={() => {}}
    />
  )
}

describe("BoardColumn の lazy カラム", () => {
  it("refreshToken が進むと再 fetch し、ステータス変更で外れたタスクが消える", async () => {
    const backlogTask = makeTask({ id: "b1", title: "バックログタスク" })
    const fetcher = vi.mocked(getBacklogTasksAction)
    fetcher.mockResolvedValueOnce([backlogTask])

    const { rerender } = renderColumn(0)
    expect(await screen.findByText("バックログタスク")).toBeInTheDocument()

    // 未着手へステータス変更 → サーバ側のバックログ一覧からは消える
    fetcher.mockResolvedValueOnce([])
    rerender(
      <BoardColumn
        columnKey="backlog"
        title="バックログ"
        statuses={["バックログ"]}
        accentStatus="バックログ"
        tasks={[]}
        searchQuery=""
        advancedFilter={NONE}
        sort={DEFAULT_SORT}
        refreshToken={1}
        onSelect={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText("バックログタスク")).not.toBeInTheDocument()
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
