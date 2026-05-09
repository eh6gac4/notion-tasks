import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { TaskManager } from "@/components/TaskManager"
import { DEFAULT_SORT } from "@/lib/task-sort"
import type { Task } from "@/types/task"

vi.mock("@/app/actions", () => ({
  setAdvancedFilterAction: vi.fn().mockResolvedValue(undefined),
  setSortAction: vi.fn().mockResolvedValue(undefined),
  refreshTasksAction: vi.fn().mockResolvedValue(undefined),
  fetchInitialDataAction: vi.fn().mockResolvedValue({ tasks: [], tagOptions: [] }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

// TaskItem は描画内容ではなくボード分配ロジックを検証するため簡略化
vi.mock("@/components/TaskItem", () => ({
  TaskItem: ({ task }: { task: Task }) => (
    <div data-testid="task-item" data-task-id={task.id} data-status={task.status ?? ""}>
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
  makeTask({ id: "6", title: "中止タスク",     status: "中止" }),
]

const NONE = { tags: [], dueDate: "any" as const, priorities: [] }

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0 })
  vi.stubGlobal("cancelAnimationFrame", () => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function getColumn(status: string) {
  return document.querySelector(`[data-testid='board-column'][data-status='${status}']`) as HTMLElement
}

describe("TaskManager ボード", () => {
  it("ボード全6カラムが描画される", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    const expected = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]
    expected.forEach((status) => {
      expect(getColumn(status)).toBeInTheDocument()
    })
  })

  it("各タスクは status と一致するカラム内にだけ並ぶ", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    expect(within(getColumn("未着手")).getByText("未着手タスク")).toBeInTheDocument()
    expect(within(getColumn("進行中")).getByText("進行中タスク")).toBeInTheDocument()
    expect(within(getColumn("完了")).getByText("完了タスク")).toBeInTheDocument()
    expect(within(getColumn("未着手")).queryByText("進行中タスク")).not.toBeInTheDocument()
    expect(within(getColumn("完了")).queryByText("中止タスク")).not.toBeInTheDocument()
  })

  it("status が null のタスクはどのカラムにも入らない", () => {
    const withNull = [...tasks, makeTask({ id: "n1", title: "ステータス不明", status: null })]
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={withNull} />
    )
    expect(screen.queryByText("ステータス不明")).not.toBeInTheDocument()
  })

  it("各カラムヘッダにそのカラムの件数が出る", () => {
    const repeat = [
      makeTask({ id: "a", title: "A", status: "未着手" }),
      makeTask({ id: "b", title: "B", status: "未着手" }),
      makeTask({ id: "c", title: "C", status: "進行中" }),
    ]
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={repeat} />
    )
    expect(within(getColumn("未着手")).getByText("2")).toBeInTheDocument()
    expect(within(getColumn("進行中")).getByText("1")).toBeInTheDocument()
  })
})

function getSearchInput() {
  return document.querySelector("[data-testid='search-input']") as HTMLInputElement
}

describe("インクリメンタルサーチ", () => {
  it("タイトル部分一致で全カラムから絞り込まれる", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    fireEvent.change(getSearchInput(), { target: { value: "進行中" } })
    expect(within(getColumn("進行中")).getByText("進行中タスク")).toBeInTheDocument()
    expect(within(getColumn("未着手")).queryByText("未着手タスク")).not.toBeInTheDocument()
  })

  it("大文字小文字を無視して検索する", () => {
    const englishTasks = [
      makeTask({ id: "e1", title: "Refactor API", status: "進行中" }),
      makeTask({ id: "e2", title: "Write Tests", status: "未着手" }),
    ]
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={englishTasks} />
    )
    fireEvent.change(getSearchInput(), { target: { value: "refactor" } })
    expect(within(getColumn("進行中")).getByText("Refactor API")).toBeInTheDocument()
    expect(within(getColumn("未着手")).queryByText("Write Tests")).not.toBeInTheDocument()
  })

  it("マッチが無いカラムは NO MATCH を表示する", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    fireEvent.change(getSearchInput(), { target: { value: "存在しない文字列" } })
    const matches = screen.getAllByText("— NO MATCH —")
    expect(matches.length).toBeGreaterThan(0)
  })
})

describe("ソート", () => {
  const sortableTasks: Task[] = [
    makeTask({ id: "p1", title: "高", status: "未着手", priority: "high",   due: "2024-04-01" }),
    makeTask({ id: "p2", title: "中", status: "未着手", priority: "medium", due: "2024-02-01" }),
    makeTask({ id: "p3", title: "低", status: "未着手", priority: "low",    due: "2024-06-01" }),
  ]

  it("ソートボタン押下で TaskSortSheet が開く", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={sortableTasks} />
    )
    expect(screen.queryByTestId("task-sort-sheet")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("sort-button"))
    expect(screen.getByTestId("task-sort-sheet")).toBeInTheDocument()
  })

  it("期限昇順ソート時はカラム内の並び順が due 昇順になる", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={{ key: "due", direction: "asc" }} tasks={sortableTasks} />
    )
    const items = within(getColumn("未着手")).getAllByTestId("task-item")
    expect(items.map((el) => el.getAttribute("data-task-id"))).toEqual(["p2", "p1", "p3"])
  })

  it("ソート active 時に sort-active-dot が表示される", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={{ key: "priority", direction: "desc" }} tasks={sortableTasks} />
    )
    expect(screen.getByTestId("sort-active-dot")).toBeInTheDocument()
  })

  it("default ソート時は sort-active-dot が表示されない", () => {
    render(
      <TaskManager tagOptions={[]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={sortableTasks} />
    )
    expect(screen.queryByTestId("sort-active-dot")).not.toBeInTheDocument()
  })
})

describe("フィルタ", () => {
  it("フィルタボタン押下で TaskFilterSheet が開く", () => {
    render(
      <TaskManager tagOptions={["Tech"]} initialAdvancedFilter={NONE} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    expect(screen.queryByTestId("task-filter-sheet")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("filter-button"))
    expect(screen.getByTestId("task-filter-sheet")).toBeInTheDocument()
  })

  it("active な advanced filter があると filter-active-dot が出る", () => {
    render(
      <TaskManager tagOptions={["Tech"]} initialAdvancedFilter={{ tags: ["Tech"], dueDate: "any", priorities: [] }} initialSort={DEFAULT_SORT} tasks={tasks} />
    )
    expect(screen.getByTestId("filter-active-dot")).toBeInTheDocument()
  })
})
