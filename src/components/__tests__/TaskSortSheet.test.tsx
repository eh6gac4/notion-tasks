import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TaskSortSheet } from "@/components/TaskSortSheet"
import { DEFAULT_SORT } from "@/lib/task-sort"
import type { SortConfig } from "@/types/task"

describe("TaskSortSheet 表示", () => {
  it("open=false のとき何もレンダリングしない", () => {
    const { container } = render(
      <TaskSortSheet open={false} sort={DEFAULT_SORT} onApply={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("open=true のとき各セクションが表示される", () => {
    render(<TaskSortSheet open={true} sort={DEFAULT_SORT} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText("並び替え")).toBeInTheDocument()
    expect(screen.getByText("方向")).toBeInTheDocument()
    expect(screen.getByTestId("sort-key-default")).toBeInTheDocument()
    expect(screen.getByTestId("sort-key-due")).toBeInTheDocument()
    expect(screen.getByTestId("sort-key-priority")).toBeInTheDocument()
  })

  it("default 選択時は方向ボタンが disabled", () => {
    render(<TaskSortSheet open={true} sort={DEFAULT_SORT} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId("sort-dir-asc")).toBeDisabled()
    expect(screen.getByTestId("sort-dir-desc")).toBeDisabled()
  })

  it("default 以外を選んだ後は方向ボタンが有効化される", () => {
    render(<TaskSortSheet open={true} sort={DEFAULT_SORT} onApply={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId("sort-key-due"))
    expect(screen.getByTestId("sort-dir-asc")).toBeEnabled()
    expect(screen.getByTestId("sort-dir-desc")).toBeEnabled()
  })
})

describe("TaskSortSheet 操作", () => {
  function setup(sort: SortConfig = DEFAULT_SORT) {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<TaskSortSheet open={true} sort={sort} onApply={onApply} onClose={onClose} />)
    return { onApply, onClose }
  }

  it("期限を選び降順で適用", () => {
    const { onApply, onClose } = setup()
    fireEvent.click(screen.getByTestId("sort-key-due"))
    fireEvent.click(screen.getByTestId("sort-dir-desc"))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith({ key: "due", direction: "desc" })
    expect(onClose).toHaveBeenCalled()
  })

  it("優先度を選び昇順（デフォルト方向）で適用", () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByTestId("sort-key-priority"))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith({ key: "priority", direction: "asc" })
  })

  it("リセットで draft が DEFAULT_SORT に戻る（適用前）", () => {
    const { onApply } = setup({ key: "priority", direction: "desc" })
    fireEvent.click(screen.getByRole("button", { name: "リセット" }))
    fireEvent.click(screen.getByRole("button", { name: "適用" }))
    expect(onApply).toHaveBeenCalledWith(DEFAULT_SORT)
  })

  it("バックドロップクリックで onClose、適用前なので onApply は呼ばれない", () => {
    const { onApply, onClose } = setup()
    fireEvent.click(screen.getByTestId("sort-key-due"))
    const backdrop = document.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
