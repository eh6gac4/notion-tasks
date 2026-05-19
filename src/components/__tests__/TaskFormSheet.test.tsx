import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TaskFormSheet } from "@/components/TaskFormSheet"

const TAG_OPTIONS = ["Network", "Blog", "Tech"]

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

describe("TaskFormSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("open=false のとき何もレンダリングしない", () => {
    const { container } = render(
      <TaskFormSheet open={false} onClose={() => {}} tagOptions={TAG_OPTIONS} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("既定の見出しと送信ラベルを表示する", () => {
    render(<TaskFormSheet open onClose={() => {}} tagOptions={TAG_OPTIONS} />)
    expect(screen.getByText("✦ New Task")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /CREATE TASK/i })).toBeInTheDocument()
  })

  it("heading / submitLabel を上書きできる", () => {
    render(
      <TaskFormSheet
        open
        onClose={() => {}}
        tagOptions={TAG_OPTIONS}
        heading="✦ New Subtask"
        submitLabel="ADD SUBTASK"
      />,
    )
    expect(screen.getByText("✦ New Subtask")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ADD SUBTASK/i })).toBeInTheDocument()
  })

  it("parentTaskId 指定時は createTaskAction に parentTaskId を渡す", async () => {
    const { createTaskAction } = await import("@/app/actions")
    const mock = vi.mocked(createTaskAction)

    render(
      <TaskFormSheet open onClose={() => {}} tagOptions={TAG_OPTIONS} parentTaskId="parent-1" />,
    )

    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.change(input, { target: { value: "子タスク" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "子タスク", parentTaskId: "parent-1" }),
      )
    })
  })

  it("parentTaskId 未指定なら parentTaskId は undefined", async () => {
    const { createTaskAction } = await import("@/app/actions")
    const mock = vi.mocked(createTaskAction)

    render(<TaskFormSheet open onClose={() => {}} tagOptions={TAG_OPTIONS} />)

    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.change(input, { target: { value: "通常タスク" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "通常タスク", parentTaskId: undefined }),
      )
    })
  })

  it("送信成功後に onClose が呼ばれる", async () => {
    const onClose = vi.fn()
    render(<TaskFormSheet open onClose={onClose} tagOptions={TAG_OPTIONS} />)

    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.change(input, { target: { value: "タスクX" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("タイトル空では createTaskAction を呼ばない", async () => {
    const { createTaskAction } = await import("@/app/actions")
    const mock = vi.mocked(createTaskAction)

    render(<TaskFormSheet open onClose={() => {}} tagOptions={TAG_OPTIONS} />)
    const input = screen.getByPlaceholderText(/TASK NAME/)
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    await new Promise((r) => setTimeout(r, 50))
    expect(mock).not.toHaveBeenCalled()
  })

  it("バックドロップクリックで onClose が呼ばれる", () => {
    const onClose = vi.fn()
    const { container } = render(
      <TaskFormSheet open onClose={onClose} tagOptions={TAG_OPTIONS} />,
    )
    const backdrop = container.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
