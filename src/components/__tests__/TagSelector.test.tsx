import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TagSelector } from "@/components/TagSelector"

const OPTIONS = ["Tech", "Blog", "Operation"]

describe("TagSelector ピル", () => {
  it("候補タグを全て描画する", () => {
    render(<TagSelector options={OPTIONS} selected={[]} onChange={() => {}} />)
    for (const tag of OPTIONS) {
      expect(screen.getByRole("button", { name: tag })).toBeInTheDocument()
    }
  })

  it("選択済みタグはアクセント色で描画される", () => {
    render(<TagSelector options={OPTIONS} selected={["Tech"]} onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "Tech" })).toHaveStyle({ backgroundColor: "#dc143c" })
  })

  it("候補にない選択済みタグもピルとして描画される", () => {
    render(<TagSelector options={OPTIONS} selected={["カスタム"]} onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "カスタム" })).toBeInTheDocument()
  })

  it("ピルクリックで選択を追加する", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Tech" }))
    expect(onChange).toHaveBeenCalledWith(["Tech"])
  })

  it("選択済みピルクリックで選択を解除する", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={["Tech", "Blog"]} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Tech" }))
    expect(onChange).toHaveBeenCalledWith(["Blog"])
  })
})

describe("TagSelector 新規追加", () => {
  it("入力 + 追加ボタンで新タグを onChange に渡す", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={["Tech"]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加")
    fireEvent.change(input, { target: { value: "新タグ" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    expect(onChange).toHaveBeenCalledWith(["Tech", "新タグ"])
  })

  it("Enter キーで新タグを追加する", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={[]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加")
    fireEvent.change(input, { target: { value: "新タグ" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onChange).toHaveBeenCalledWith(["新タグ"])
  })

  it("追加成功後に入力欄がクリアされる", () => {
    render(<TagSelector options={OPTIONS} selected={[]} onChange={() => {}} />)
    const input = screen.getByLabelText("新しいタグを追加") as HTMLInputElement
    fireEvent.change(input, { target: { value: "新タグ" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))
    expect(input.value).toBe("")
  })

  it("空入力では onChange は呼ばれない", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={[]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加")
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("カンマを含む名前は拒否される", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={[]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加")
    fireEvent.change(input, { target: { value: "a,b" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("既に選択済みのタグは追加せず入力をクリアする", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={["Tech"]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加") as HTMLInputElement
    fireEvent.change(input, { target: { value: "tech" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe("")
  })

  it("候補と同名（大小無視）の入力は既存名でトグルされる", () => {
    const onChange = vi.fn()
    render(<TagSelector options={OPTIONS} selected={[]} onChange={onChange} />)

    const input = screen.getByLabelText("新しいタグを追加")
    fireEvent.change(input, { target: { value: "tech" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    expect(onChange).toHaveBeenCalledWith(["Tech"])
  })
})
