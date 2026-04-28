import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TaskFilterSheet } from "@/components/TaskFilterSheet"
import { DEFAULT_ADVANCED_FILTER } from "@/constants/filters"

const TAGS = ["Tech", "Blog", "Operation"]

describe("TaskFilterSheet 表示", () => {
  it("open=false のとき何もレンダリングしない", () => {
    const { container } = render(
      <TaskFilterSheet
        open={false}
        filter={DEFAULT_ADVANCED_FILTER}
        tagOptions={TAGS}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("open=true のとき各セクションが表示される", () => {
    render(
      <TaskFilterSheet
        open={true}
        filter={DEFAULT_ADVANCED_FILTER}
        tagOptions={TAGS}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText("タグ")).toBeInTheDocument()
    expect(screen.getByText("期限")).toBeInTheDocument()
    expect(screen.getByText("優先度")).toBeInTheDocument()
    for (const tag of TAGS) {
      expect(screen.getByRole("button", { name: tag })).toBeInTheDocument()
    }
  })

  it("tagOptions が空のとき「タグがありません」と表示", () => {
    render(
      <TaskFilterSheet open={true} filter={DEFAULT_ADVANCED_FILTER} tagOptions={[]} onApply={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByText("タグがありません")).toBeInTheDocument()
  })
})

describe("TaskFilterSheet 操作", () => {
  function setup(filter = DEFAULT_ADVANCED_FILTER) {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(
      <TaskFilterSheet open={true} filter={filter} tagOptions={TAGS} onApply={onApply} onClose={onClose} />,
    )
    return { onApply, onClose }
  }

  it("タグをクリック→適用で onApply が選択タグ付きで呼ばれる", () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole("button", { name: "Tech" }))
    fireEvent.click(screen.getByRole("button", { name: "Blog" }))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ tags: ["Tech", "Blog"] }))
  })

  it("期限を期限切れに変更→適用", () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByTestId("due-overdue"))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "overdue" }))
  })

  it("優先度を高だけ選択→適用", () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByTestId("priority-high"))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ priorities: ["high"] }))
  })

  it("リセットで draft がデフォルトに戻る（適用前）", () => {
    const { onApply } = setup({ tags: ["Tech"], dueDate: "with", priorities: ["high"] })
    fireEvent.click(screen.getByRole("button", { name: "リセット" }))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith(DEFAULT_ADVANCED_FILTER)
  })

  it("適用すると onClose も呼ばれる", () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onClose).toHaveBeenCalled()
  })

  it("バックドロップクリックで onClose、適用前なので onApply は呼ばれない", () => {
    const { onApply, onClose } = setup()
    fireEvent.click(screen.getByRole("button", { name: "Tech" }))
    const backdrop = document.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
