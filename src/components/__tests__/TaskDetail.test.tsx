import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { TaskDetail } from "@/components/TaskDetail"
import { updateTaskAction, getTaskBlocksAction, updateTaskBlocksAction } from "@/app/actions"
import type { Task } from "@/types/task"

vi.mock("@/app/actions", () => ({
  updateTaskAction: vi.fn().mockResolvedValue(undefined),
  getTaskBlocksAction: vi.fn().mockResolvedValue(""),
  updateTaskBlocksAction: vi.fn().mockResolvedValue(undefined),
}))

// requestAnimationFrame を同期実行してアニメーション初期化を完了させる
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
  vi.mocked(updateTaskAction).mockResolvedValue(undefined)
  vi.mocked(getTaskBlocksAction).mockResolvedValue("")
  vi.mocked(updateTaskBlocksAction).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "テストタスク",
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe("TaskDetail レンダリング", () => {
  it("タスクタイトルを表示する", () => {
    render(<TaskDetail task={makeTask({ title: "買い物リスト" })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("買い物リスト")).toBeInTheDocument()
  })

  it("現在のステータスバッジを表示する", () => {
    render(<TaskDetail task={makeTask({ status: "進行中" })} onClose={() => {}} />)
    expect(screen.getAllByText("進行中").length).toBeGreaterThan(0)
  })

  it("status が null のとき「未着手」バッジを表示する", () => {
    render(<TaskDetail task={makeTask({ status: null })} onClose={() => {}} />)
    expect(screen.getAllByText("未着手").length).toBeGreaterThan(0)
  })

  it("priority が high のとき「↑ High」を表示する", () => {
    render(<TaskDetail task={makeTask({ priority: "high" })} onClose={() => {}} />)
    expect(screen.getByText("↑ High")).toBeInTheDocument()
  })

  it("priority が medium のとき「→ Med」を表示する", () => {
    render(<TaskDetail task={makeTask({ priority: "medium" })} onClose={() => {}} />)
    expect(screen.getByText("→ Med")).toBeInTheDocument()
  })

  it("priority が low のとき「↓ Low」を表示する", () => {
    render(<TaskDetail task={makeTask({ priority: "low" })} onClose={() => {}} />)
    expect(screen.getByText("↓ Low")).toBeInTheDocument()
  })

  it("priority が null のとき priority select が未設定になる", () => {
    render(<TaskDetail task={makeTask({ priority: null })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("未設定")).toBeInTheDocument()
  })

  it("未来の due date が date input に反映される", () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const due = future.toISOString().split("T")[0]
    render(<TaskDetail task={makeTask({ due })} onClose={() => {}} />)
    expect(screen.getByDisplayValue(due)).toBeInTheDocument()
  })

  it("過去の due date が date input に反映される", () => {
    render(<TaskDetail task={makeTask({ due: "2020-01-01" })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("2020-01-01")).toBeInTheDocument()
  })

  it("due が null のとき日付を表示しない", () => {
    render(<TaskDetail task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.queryByText(/\d{4}年\d+月\d+日/)).not.toBeInTheDocument()
  })

  it("タグを表示する", () => {
    render(<TaskDetail task={makeTask({ tags: ["Tech", "Blog"] })} onClose={() => {}} />)
    expect(screen.getByText("Tech")).toBeInTheDocument()
    expect(screen.getByText("Blog")).toBeInTheDocument()
  })

  it("source を表示する", () => {
    render(<TaskDetail task={makeTask({ source: "GitHub" })} onClose={() => {}} />)
    expect(screen.getByText("GitHub")).toBeInTheDocument()
  })

  it("sourceUrl をリンクとして表示する", () => {
    render(<TaskDetail task={makeTask({ sourceUrl: "https://example.com" })} onClose={() => {}} />)
    const link = screen.getByText("https://example.com")
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com")
  })

  it("子タスク数を表示する", () => {
    render(<TaskDetail task={makeTask({ childTaskIds: ["c1", "c2"] })} onClose={() => {}} />)
    expect(screen.getByText("2件")).toBeInTheDocument()
  })

  it("親タスク数を表示する", () => {
    render(<TaskDetail task={makeTask({ parentTaskIds: ["p1"] })} onClose={() => {}} />)
    expect(screen.getByText("1件")).toBeInTheDocument()
  })

  it("Notion リンクが正しい href を持つ", () => {
    render(<TaskDetail task={makeTask({ url: "https://notion.so/abc" })} onClose={() => {}} />)
    const link = screen.getByText(/Open in Notion/)
    expect(link.closest("a")).toHaveAttribute("href", "https://notion.so/abc")
  })
})

describe("TaskDetail フィールド変更", () => {
  it("ステータス変更で updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail task={makeTask({ id: "t1", status: "未着手" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[0], { target: { value: "進行中" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { status: "進行中" })
    })
  })

  it("ステータス変更後にバッジが即時更新される", async () => {
    render(<TaskDetail task={makeTask({ status: "未着手" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[0], { target: { value: "完了" } })

    await waitFor(() => {
      expect(screen.getAllByText("完了").length).toBeGreaterThan(0)
    })
  })

  it("Priority 変更で updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail task={makeTask({ id: "t1" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[1], { target: { value: "high" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { priority: "high" })
    })
  })

  it("タグトグルで updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail task={makeTask({ id: "t1", tags: [] })} onClose={() => {}} />)
    fireEvent.click(screen.getByText("Tech"))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { tags: ["Tech"] })
    })
  })

  it("タイトル blur で updateTaskAction が呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail task={makeTask({ id: "t1", title: "旧タイトル" })} onClose={() => {}} />)
    const titleInput = screen.getByRole("textbox", { name: "タイトル" })
    fireEvent.change(titleInput, { target: { value: "新タイトル" } })
    fireEvent.blur(titleInput)

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { title: "新タイトル" })
    })
  })
})

describe("TaskDetail 本文編集", () => {
  it("取得した本文を表示する", async () => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("## 本文見出し\n\n- 箇条書き")

    render(<TaskDetail task={makeTask()} onClose={() => {}} />)

    expect(await screen.findByText("本文見出し")).toBeInTheDocument()
    expect(screen.getByText("箇条書き")).toBeInTheDocument()
  })

  it("編集して保存すると updateTaskBlocksAction が呼ばれる", async () => {
    const updateBlocksMock = vi.mocked(updateTaskBlocksAction)
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("元の本文")

    render(<TaskDetail task={makeTask()} onClose={() => {}} />)

    await screen.findByText("元の本文")
    fireEvent.click(screen.getByRole("button", { name: "編集" }))
    fireEvent.change(screen.getByPlaceholderText("Markdownで入力（# 見出し、- リスト など）"), {
      target: { value: "更新後の本文" },
    })
    fireEvent.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => {
      expect(updateBlocksMock).toHaveBeenCalledWith("t1", "更新後の本文")
    })

    expect(await screen.findByText("更新後の本文")).toBeInTheDocument()
  })

  it("本文取得に失敗してもローディングから復帰する", async () => {
    vi.mocked(getTaskBlocksAction).mockRejectedValueOnce(new Error("load failed"))

    render(<TaskDetail task={makeTask()} onClose={() => {}} />)

    expect(await screen.findByText("本文の読み込みに失敗しました。")).toBeInTheDocument()
    expect(screen.getByText("本文なし")).toBeInTheDocument()
  })

  it("本文保存に失敗しても編集中のまま復帰する", async () => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("元の本文")
    vi.mocked(updateTaskBlocksAction).mockRejectedValueOnce(new Error("save failed"))

    render(<TaskDetail task={makeTask()} onClose={() => {}} />)

    await screen.findByText("元の本文")
    fireEvent.click(screen.getByRole("button", { name: "編集" }))
    fireEvent.change(screen.getByPlaceholderText("Markdownで入力（# 見出し、- リスト など）"), {
      target: { value: "保存失敗本文" },
    })
    fireEvent.click(screen.getByRole("button", { name: "保存" }))

    expect(await screen.findByText("本文の保存に失敗しました。")).toBeInTheDocument()
    expect(screen.getByDisplayValue("保存失敗本文")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "保存" })).not.toBeDisabled()
    })
  })

  it("task.id 切り替え後に古い本文取得結果で上書きしない", async () => {
    const first = deferred<string>()
    const second = deferred<string>()

    vi.mocked(getTaskBlocksAction).mockImplementation((id: string) => {
      if (id === "t1") return first.promise
      if (id === "t2") return second.promise
      return Promise.resolve("")
    })

    const { rerender } = render(<TaskDetail task={makeTask({ id: "t1" })} onClose={() => {}} />)

    rerender(<TaskDetail task={makeTask({ id: "t2", url: "https://notion.so/t2" })} onClose={() => {}} />)

    await act(async () => {
      second.resolve("新しい本文")
    })

    expect(await screen.findByText("新しい本文")).toBeInTheDocument()

    await act(async () => {
      first.resolve("古い本文")
    })

    await waitFor(() => {
      expect(screen.queryByText("古い本文")).not.toBeInTheDocument()
    })
    expect(screen.getByText("新しい本文")).toBeInTheDocument()
  })
})

describe("TaskDetail 閉じる動作", () => {
  it("ハンドルボタンクリックで onClose が 280ms 後に呼ばれる", async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<TaskDetail task={makeTask()} onClose={onClose} />)

    // ハンドルボタンは最初のボタン
    const handleBtn = screen.getAllByRole("button")[0]
    fireEvent.click(handleBtn)

    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(280)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("バックドロップクリックで onClose が 280ms 後に呼ばれる", async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(<TaskDetail task={makeTask()} onClose={onClose} />)

    const backdrop = container.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)

    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(280)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
