import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TaskCreate } from "@/components/TaskCreate"

const TAG_OPTIONS = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]

vi.mock("@/app/actions", () => ({
  createTaskAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("react-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-dom")>()
  return {
    ...actual,
    useFormStatus: vi.fn().mockReturnValue({ pending: false }),
  }
})

describe("TaskCreate FAB", () => {
  it("FAB が aria-label 付きでレンダリングされる", () => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    expect(screen.getByRole("button", { name: "タスクを追加" })).toBeInTheDocument()
  })

  it("初期状態でフォームは非表示", () => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    expect(screen.queryByText("✦ New Task")).not.toBeInTheDocument()
  })

  it("FAB クリックでフォームが表示される", () => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }))
    expect(screen.getByText("✦ New Task")).toBeInTheDocument()
  })
})

describe("TaskCreate フォーム表示", () => {
  beforeEach(() => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }))
  })

  it("タイトル入力フィールドが存在する", () => {
    expect(screen.getByPlaceholderText(/TASK NAME/)).toBeInTheDocument()
  })

  it("ステータス select が存在する", () => {
    const selects = screen.getAllByRole("combobox")
    const statusSelect = selects.find((s) => {
      const options = Array.from(s.querySelectorAll("option")).map((o) => o.value)
      return options.includes("未着手")
    })
    expect(statusSelect).toBeDefined()
  })

  it("全タグオプションが表示される", () => {
    const tagLabels = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]
    for (const tag of tagLabels) {
      expect(screen.getByRole("button", { name: tag })).toBeInTheDocument()
    }
  })

  it("CREATE TASK ボタンが存在する", () => {
    expect(screen.getByRole("button", { name: /CREATE TASK/i })).toBeInTheDocument()
  })
})

describe("TaskCreate タグトグル", () => {
  beforeEach(() => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }))
  })

  it("タグをクリックすると選択される", () => {
    const techBtn = screen.getByRole("button", { name: "Tech" })
    fireEvent.click(techBtn)
    // 選択済みスタイル（backgroundColor が #ff00cc）になる
    expect(techBtn).toHaveStyle({ backgroundColor: "#ff00cc" })
  })

  it("選択済みタグを再クリックすると解除される", () => {
    const techBtn = screen.getByRole("button", { name: "Tech" })
    fireEvent.click(techBtn)
    fireEvent.click(techBtn)
    expect(techBtn).not.toHaveStyle({ backgroundColor: "#ff00cc" })
  })

  it("複数タグを同時に選択できる", () => {
    fireEvent.click(screen.getByRole("button", { name: "Tech" }))
    fireEvent.click(screen.getByRole("button", { name: "Blog" }))
    expect(screen.getByRole("button", { name: "Tech" })).toHaveStyle({ backgroundColor: "#ff00cc" })
    expect(screen.getByRole("button", { name: "Blog" })).toHaveStyle({ backgroundColor: "#ff00cc" })
  })
})

describe("TaskCreate バックドロップで閉じる", () => {
  it("バックドロップクリックでフォームが閉じる", () => {
    const { container } = render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }))
    expect(screen.getByText("✦ New Task")).toBeInTheDocument()

    const backdrop = container.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(screen.queryByText("✦ New Task")).not.toBeInTheDocument()
  })
})

describe("TaskCreate フォーム送信", () => {
  beforeEach(() => {
    render(<TaskCreate tagOptions={TAG_OPTIONS} />)
    fireEvent.click(screen.getByRole("button", { name: "タスクを追加" }))
  })

  it("タイトルを入力して送信すると createTaskAction が呼ばれる", async () => {
    const { createTaskAction } = await import("@/app/actions")
    const mock = vi.mocked(createTaskAction)
    mock.mockClear()

    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.change(input, { target: { value: "新しいタスク" } })

    const form = input.closest("form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "新しいタスク" })
      )
    })
  })

  it("タイトルが空のとき createTaskAction は呼ばれない", async () => {
    const { createTaskAction } = await import("@/app/actions")
    const mock = vi.mocked(createTaskAction)
    mock.mockClear()

    const input = screen.getByPlaceholderText(/TASK NAME/)
    const form = input.closest("form") as HTMLFormElement
    fireEvent.submit(form)

    // 非同期処理待ち後も呼ばれていないことを確認
    await new Promise((r) => setTimeout(r, 50))
    expect(mock).not.toHaveBeenCalled()
  })

  it("送信成功後にフォームが閉じる", async () => {
    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.change(input, { target: { value: "タスクA" } })

    const form = input.closest("form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.queryByText("✦ New Task")).not.toBeInTheDocument()
    })
  })
})
