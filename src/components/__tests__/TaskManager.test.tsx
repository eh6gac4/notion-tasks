import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { TaskManager } from "@/components/TaskManager"
import { FILTERS } from "@/constants/filters"
import type { Task } from "@/types/task"

vi.mock("@/app/actions", () => ({
  setFilterAction: vi.fn().mockResolvedValue(undefined),
  refreshTasksAction: vi.fn().mockResolvedValue(undefined),
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

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 0 })
  vi.stubGlobal("cancelAnimationFrame", () => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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
    expect(screen.getByText("5 TASKS")).toBeInTheDocument()
  })

  it("フィルターに一致するタスクがない場合「タスクがありません」を表示する", () => {
    const noTasks = [makeTask({ status: "完了" })]
    render(<TaskManager tasks={noTasks} currentFilter="todo" />)
    expect(screen.getByText("— NO TASKS —")).toBeInTheDocument()
  })

  it("status が null のタスクは any ステータスフィルターにマッチしない", () => {
    const nullStatusTasks = [makeTask({ id: "n1", title: "ステータス不明", status: null })]
    render(<TaskManager tasks={nullStatusTasks} currentFilter="active" />)
    expect(screen.queryByText("ステータス不明")).not.toBeInTheDocument()
  })
})

// ─── スワイプテスト用ヘルパー ─────────────────────────────────────────────

function swipe(el: HTMLElement, dx: number, dy = 0) {
  fireEvent.touchStart(el, { touches: [{ clientX: 0, clientY: 0 }] })
  fireEvent.touchMove(el, { touches: [{ clientX: dx / 2, clientY: dy / 2 }] })
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: dx, clientY: dy }] })
}

function getMain() {
  return document.querySelector("[data-testid='task-list-main']") as HTMLElement
}

describe("スワイプフィルター切り替え", () => {
  // commitSwipe 内の setTimeout(150) を制御するため fake timers を使用
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("左スワイプ 80px で active(0番) → todo(1番) に変わる", async () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    act(() => { swipe(getMain(), -80) })
    await act(async () => { vi.runAllTimers() })
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.queryByText("進行中タスク")).not.toBeInTheDocument()
  })

  it("右スワイプ 80px で todo(1番) → active(0番) に戻る", async () => {
    render(<TaskManager tasks={tasks} currentFilter="todo" />)
    act(() => { swipe(getMain(), 80) })
    await act(async () => { vi.runAllTimers() })
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
  })

  it("左スワイプ @ all(末尾) → active(先頭) に循環する", async () => {
    render(<TaskManager tasks={tasks} currentFilter="all" />)
    act(() => { swipe(getMain(), -80) })
    await act(async () => { vi.runAllTimers() })
    // active: 未着手・進行中のみ
    expect(screen.getByText("未着手タスク")).toBeInTheDocument()
    expect(screen.queryByText("確認中タスク")).not.toBeInTheDocument()
  })

  it("右スワイプ @ active(先頭) → all(末尾) に循環する", async () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    act(() => { swipe(getMain(), 80) })
    await act(async () => { vi.runAllTimers() })
    expect(screen.getAllByTestId("task-item")).toHaveLength(5)
  })

  it("50px スワイプ（閾値未満）ではフィルターが変わらない", async () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    act(() => { swipe(getMain(), -50) })
    await act(async () => { vi.runAllTimers() })
    // active のまま: 進行中が表示される
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
    expect(screen.queryByText("確認中タスク")).not.toBeInTheDocument()
  })

  it("縦スワイプ (dx=30, dy=200) ではフィルターが変わらない", async () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    act(() => { swipe(getMain(), 30, 200) })
    await act(async () => { vi.runAllTimers() })
    expect(screen.getByText("進行中タスク")).toBeInTheDocument()
    expect(screen.queryByText("確認中タスク")).not.toBeInTheDocument()
  })
})

describe("ページネーションドット", () => {
  it("FILTERS の数だけドットが表示される", () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    expect(screen.getAllByRole("tab")).toHaveLength(FILTERS.length)
  })

  it("現在フィルターのドットが aria-selected=true、他は false", () => {
    render(<TaskManager tasks={tasks} currentFilter="review" />)
    const dots = screen.getAllByRole("tab")
    const activeIdx = FILTERS.findIndex((f) => f.key === "review")
    dots.forEach((dot, i) => {
      expect(dot.getAttribute("aria-selected")).toBe(i === activeIdx ? "true" : "false")
    })
  })

  it("ドットをクリックするとフィルターが変わる", async () => {
    render(<TaskManager tasks={tasks} currentFilter="active" />)
    const allDot = screen.getByRole("tab", { name: "すべて" })
    await act(async () => { fireEvent.click(allDot) })
    await waitFor(() => {
      expect(screen.getAllByTestId("task-item")).toHaveLength(5)
    })
  })
})
