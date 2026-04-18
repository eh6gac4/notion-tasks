import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskManager } from "@/components/TaskManager"
import type { Task } from "@/types/task"

vi.mock("@/app/actions", () => ({
  setFilterAction: vi.fn().mockResolvedValue(undefined),
}))

// TaskItem / TaskCreate は描画内容ではなくフィルター論理をテストするため簡略化
vi.mock("@/components/TaskItem", () => ({
  TaskItem: ({ task }: { task: Task }) => (
    <div data-testid="task-item" data-task-id={task.id}>
      {task.title}
    </div>
  ),
}))

vi.mock("@/components/TaskCreate", () => ({
  TaskCreate: () => null,
}))

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "タスク",
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

const tasks: Task[] = [
  makeTask({ id: "1", title: "未着手タスク",   status: "未着手" }),
  makeTask({ id: "2", title: "進行中タスク",   status: "進行中" }),
  makeTask({ id: "3", title: "確認中タスク",   status: "確認中" }),
  makeTask({ id: "4", title: "一時中断タスク", status: "一時中断" }),
  makeTask({ id: "5", title: "完了タスク",     status: "完了" }),
]

describe("TaskManager フィルター", () => {
  it("active フィルターは進行中・未着手のみを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
    expect(screen.queryByText("確認中タスク")).not.toBeInTheDocument()
    expect(screen.queryByText("一時中断タスク")).not.toBeInTheDocument()
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument()
  })

  it("todo フィルターは未着手のみを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="todo" />)
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.queryByText("進行中タスク")).not.toBeInTheDocument()
  })

  it("doing フィルターは進行中のみを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="doing" />)
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
    expect(screen.queryByText("未着手タスク")).not.toBeInTheDocument()
  })

  it("review フィルターは確認中のみを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="review" />)
    expect(screen.getByText("確認中タスク")).toBeInTheDocument()
    expect(screen.queryByText("進行中タスク")).not.toBeInTheDocument()
  })

  it("paused フィルターは一時中断のみを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="paused" />)
    expect(screen.getByText("一時中断タスク")).toBeInTheDocument()
    expect(screen.queryByText("進行中タスク")).not.toBeInTheDocument()
  })

  it("all フィルターはすべてのタスクを表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="all" />)
    expect(screen.getAllByTestId("task-item")).toHaveLength(5)
  })

  it("不明なフィルターキーは active にフォールバックする", () => {
    render(<TaskManager tasks={tasks} currentFilter="unknown-key" />)
    // active = 進行中・未着手
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument()
  })

  it("タスク数を表示する", () => {
    render(<TaskManager tasks={tasks} currentFilter="all" />)
    expect(screen.getByText("5件")).toBeInTheDocument()
  })

  it("フィルターに一致するタスクがない場合「タスクがありません」を表示する", () => {
    const noTasks = [makeTask({ status: "完了" })]
    render(<TaskManager tasks={noTasks} currentFilter="todo" />)
    expect(screen.getByText("タスクがありません")).toBeInTheDocument()
  })

  it("status が null のタスクは any ステータスフィルターにマッチしない", () => {
    const nullStatusTasks = [makeTask({ id: "n1", title: "ステータス不明", status: null })]
    render(<TaskManager tasks={nullStatusTasks} currentFilter="active" />)
    expect(screen.queryByText("ステータス不明")).not.toBeInTheDocument()
  })
})
