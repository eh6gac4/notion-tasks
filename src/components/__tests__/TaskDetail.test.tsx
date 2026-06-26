import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { TaskDetail } from "@/components/TaskDetail"
import { updateTaskAction, getTaskBlocksAction, updateTaskBlocksAction, getTasksByIdsAction } from "@/app/actions"
import type { Task } from "@/types/task"

const TAG_OPTIONS = ["Network", "Blog", "Operation", "Finance", "Tech", "買い物🛍️"]

vi.mock("@/app/actions", () => ({
  updateTaskAction: vi.fn().mockResolvedValue(undefined),
  getTaskBlocksAction: vi.fn().mockResolvedValue(""),
  updateTaskBlocksAction: vi.fn().mockResolvedValue(undefined),
  getTasksByIdsAction: vi.fn().mockResolvedValue([]),
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
  vi.mocked(getTasksByIdsAction).mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    url: "https://notion.so/t1",
    title: "テストタスク",
    icon: null,
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
    attachments: [],
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
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ title: "買い物リスト" })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("買い物リスト")).toBeInTheDocument()
  })

  it("現在のステータスバッジを表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ status: "進行中" })} onClose={() => {}} />)
    expect(screen.getAllByText("進行中").length).toBeGreaterThan(0)
  })

  it("status が null のとき「未着手」バッジを表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ status: null })} onClose={() => {}} />)
    expect(screen.getAllByText("未着手").length).toBeGreaterThan(0)
  })

  it("priority が high のとき「🚨 High」を表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ priority: "high" })} onClose={() => {}} />)
    expect(screen.getByText("🚨 High")).toBeInTheDocument()
  })

  it("priority が medium のとき「⚠️ Med」を表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ priority: "medium" })} onClose={() => {}} />)
    expect(screen.getByText("⚠️ Med")).toBeInTheDocument()
  })

  it("priority が low のとき「💤 Low」を表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ priority: "low" })} onClose={() => {}} />)
    expect(screen.getByText("💤 Low")).toBeInTheDocument()
  })

  it("priority が null のとき priority select が未設定になる", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ priority: null })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("未設定")).toBeInTheDocument()
  })

  it("未来の due date が date input に反映される", () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const due = future.toISOString().split("T")[0]
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due })} onClose={() => {}} />)
    expect(screen.getByDisplayValue(due)).toBeInTheDocument()
  })

  it("過去の due date が date input に反映される", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: "2020-01-01" })} onClose={() => {}} />)
    expect(screen.getByDisplayValue("2020-01-01")).toBeInTheDocument()
  })

  it("due が null のとき日付を表示しない", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.queryByText(/\d{4}年\d+月\d+日/)).not.toBeInTheDocument()
  })

  it("時刻 input が描画される", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.getByLabelText("期限の時刻")).toBeInTheDocument()
  })

  it("時刻 input は 5 分刻みヒント（step=300 秒）を持つ", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.getByLabelText("期限の時刻")).toHaveAttribute("step", "300")
  })

  it("時刻 input は type=time", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.getByLabelText("期限の時刻")).toHaveAttribute("type", "time")
  })

  it("date が null のとき時刻 input は disabled", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: null })} onClose={() => {}} />)
    expect(screen.getByLabelText("期限の時刻")).toBeDisabled()
  })

  it("date が設定済みなら時刻 input は活性", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: "2026-04-30" })} onClose={() => {}} />)
    expect(screen.getByLabelText("期限の時刻")).not.toBeDisabled()
  })

  it("時刻付き due は時刻 input に反映される", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ due: "2026-04-30T18:30:00.000+09:00" })} onClose={() => {}} />)
    const dateInput = document.querySelector("input[type='date']") as HTMLInputElement
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const timeInput = screen.getByLabelText("期限の時刻") as HTMLInputElement
    expect(timeInput.value).toMatch(/^\d{2}:\d{2}$/)
  })

  it("タグを表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ tags: ["Tech", "Blog"] })} onClose={() => {}} />)
    expect(screen.getByText("Tech")).toBeInTheDocument()
    expect(screen.getByText("Blog")).toBeInTheDocument()
  })

  it("source を表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ source: "GitHub" })} onClose={() => {}} />)
    expect(screen.getByText("GitHub")).toBeInTheDocument()
  })

  it("sourceUrl をリンクとして表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ sourceUrl: "https://example.com" })} onClose={() => {}} />)
    const link = screen.getByText("https://example.com")
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com")
  })

  it("サブタスクセクションと追加ボタンを常に表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)
    expect(screen.getByTestId("subtask-section")).toBeInTheDocument()
    expect(screen.getByTestId("subtask-add-button")).toBeInTheDocument()
  })

  it("子タスクが無いとき「なし」を表示する", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)
    expect(screen.getByText("なし")).toBeInTheDocument()
  })

  it("Notion リンクが正しい href を持つ", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ url: "https://notion.so/abc" })} onClose={() => {}} />)
    const link = screen.getByText(/Open in Notion/)
    expect(link.closest("a")).toHaveAttribute("href", "https://notion.so/abc")
  })
})

describe("TaskDetail フィールド変更", () => {
  it("ステータス変更で updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", status: "未着手" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[0], { target: { value: "進行中" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { status: "進行中" })
    })
  })

  it("ステータス変更後にバッジが即時更新される", async () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ status: "未着手" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[0], { target: { value: "完了" } })

    await waitFor(() => {
      expect(screen.getAllByText("完了").length).toBeGreaterThan(0)
    })
  })

  it("Priority 変更で updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[1], { target: { value: "high" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { priority: "high" })
    })
  })

  it("Priority を「未設定」にすると priority: null で更新される", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", priority: "high" })} onClose={() => {}} />)
    const selects = screen.getAllByRole("combobox")
    fireEvent.change(selects[1], { target: { value: "" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { priority: null })
    })
  })

  it("タグトグルで updateTaskAction が即時呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", tags: [] })} onClose={() => {}} />)
    fireEvent.click(screen.getByText("Tech"))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { tags: ["Tech"] })
    })
  })

  it("新規タグを追加すると updateTaskAction に新タグ入りで送られる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", tags: [] })} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText("新しいタグを追加"), { target: { value: "新タグ" } })
    fireEvent.click(screen.getByRole("button", { name: "タグを追加" }))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { tags: ["新タグ"] })
    })
  })

  it("時刻入力で updateTaskAction に時刻入り due が渡る", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30" })} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText("期限の時刻"), { target: { value: "18:35" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          due: expect.stringMatching(/^2026-04-30T18:35:00\.000[+-]\d{2}:\d{2}$/),
        }),
      )
    })
  })

  it("5 分刻みでない時刻入力は最寄りの 5 分にスナップして保存される", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30" })} onClose={() => {}} />)
    const timeInput = screen.getByLabelText("期限の時刻") as HTMLInputElement
    fireEvent.change(timeInput, { target: { value: "18:33" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          due: expect.stringMatching(/^2026-04-30T18:35:00\.000[+-]\d{2}:\d{2}$/),
        }),
      )
    })
    expect(timeInput.value).toBe("18:35")
  })

  it("時刻 input をクリアすると updateTaskAction の due は date 文字列のみ", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30T18:00:00.000+09:00" })} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText("期限の時刻"), { target: { value: "" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { due: "2026-04-30" })
    })
  })

  it("日付クリアで時刻もクリアされ updateTaskAction の due は null", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30T18:00:00.000+09:00" })} onClose={() => {}} />)
    const dateInput = document.querySelector("input[type='date']") as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: "" } })

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { due: null })
    })
    expect(screen.getByLabelText("期限の時刻")).toBeDisabled()
  })

  it("時刻クリアボタンで時刻だけ消えて日付は残る (モバイル native picker の代替)", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30T18:00:00.000+09:00" })} onClose={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "時刻をクリア" }))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { due: "2026-04-30" })
    })
    // クリア後はボタン自体も消える (time === "" のため)
    expect(screen.queryByRole("button", { name: "時刻をクリア" })).not.toBeInTheDocument()
  })

  it("日付クリアボタンで日付・時刻の両方が消えて due は null", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", due: "2026-04-30T18:00:00.000+09:00" })} onClose={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "日付をクリア" }))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith("t1", { due: null })
    })
    expect(screen.queryByRole("button", { name: "日付をクリア" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "時刻をクリア" })).not.toBeInTheDocument()
  })

  it("タイトル blur で updateTaskAction が呼ばれる", async () => {
    const mock = vi.mocked(updateTaskAction)
    mock.mockClear()

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1", title: "旧タイトル" })} onClose={() => {}} />)
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

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    expect(await screen.findByText("本文見出し")).toBeInTheDocument()
    expect(screen.getByText("箇条書き")).toBeInTheDocument()
  })

  it("編集して保存すると updateTaskBlocksAction が呼ばれる", async () => {
    const updateBlocksMock = vi.mocked(updateTaskBlocksAction)
    vi.mocked(getTaskBlocksAction)
      .mockResolvedValueOnce("元の本文")
      .mockResolvedValueOnce("更新後の本文")

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

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

  it("画像付き本文を編集・保存しても画像が再フェッチで戻る", async () => {
    vi.mocked(getTaskBlocksAction)
      .mockResolvedValueOnce("元の本文\n![プレビュー](https://example.com/img.png)")
      // 保存後の再フェッチ：Notion 側に画像は残ったまま、テキストだけ更新された状態を返す
      .mockResolvedValueOnce("更新後の本文\n![プレビュー](https://example.com/img.png)")

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    expect(await screen.findByRole("img", { name: "プレビュー" })).toHaveAttribute("src", "https://example.com/img.png")

    fireEvent.click(screen.getByRole("button", { name: "編集" }))
    fireEvent.change(screen.getByPlaceholderText("Markdownで入力（# 見出し、- リスト など）"), {
      target: { value: "更新後の本文\n![プレビュー](https://example.com/img.png)" },
    })
    fireEvent.click(screen.getByRole("button", { name: "保存" }))

    expect(await screen.findByText("更新後の本文")).toBeInTheDocument()
    expect(await screen.findByRole("img", { name: "プレビュー" })).toHaveAttribute("src", "https://example.com/img.png")
  })

  it("本文中の URL がクリッカブルリンクになる", async () => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("詳細は https://example.com を参照")

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    const link = await screen.findByRole("link", { name: "https://example.com" })
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it.each([
    ["句点（。）", "詳細は https://example.com。"],
    ["読点（、）", "詳細は https://example.com、 次の手順へ"],
    ["全角感嘆符（！）", "見てください https://example.com！"],
    ["全角疑問符（？）", "これは https://example.com？"],
    ["全角閉じ括弧（）", "（参考: https://example.com）"],
    ["全角閉じ鉤括弧（」）", "「参照 https://example.com」"],
    ["ASCII ピリオド", "詳細は https://example.com. を参照"],
    ["全角閉じ括弧のパーセントエンコード", "詳細は https://example.com%EF%BC%89%E3%81%A7%E4%BA%8B%E6%A1%88%E3%81%AE%E8%A9%B3%E7%B4%B0%E3%82%92%E7%A2%BA%E8%AA%8D"],
    ["全角閉じ括弧＋日本語テキスト（リテラル）", "詳細は https://example.com）で事案の詳細と対応を確認"],
  ])("URL 末尾の %s が URL に含まれない", async (_, bodyText) => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce(bodyText)

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    const link = await screen.findByRole("link", { name: "https://example.com" })
    expect(link).toHaveAttribute("href", "https://example.com")
  })

  it("本文中の画像 markdown を img として描画する", async () => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("![スクショ](https://example.com/img.png)")

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    const img = await screen.findByRole("img", { name: "スクショ" })
    expect(img).toHaveAttribute("src", "https://example.com/img.png")
  })

  it("本文取得に失敗してもローディングから復帰する", async () => {
    vi.mocked(getTaskBlocksAction).mockRejectedValueOnce(new Error("load failed"))

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    expect(await screen.findByText("本文の読み込みに失敗しました。")).toBeInTheDocument()
    expect(screen.getByText("本文なし")).toBeInTheDocument()
  })

  it("本文保存に失敗しても編集中のまま復帰する", async () => {
    vi.mocked(getTaskBlocksAction).mockResolvedValueOnce("元の本文")
    vi.mocked(updateTaskBlocksAction).mockRejectedValueOnce(new Error("save failed"))

    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

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

    const { rerender } = render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t1" })} onClose={() => {}} />)

    rerender(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask({ id: "t2", url: "https://notion.so/t2" })} onClose={() => {}} />)

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
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={onClose} />)

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
    const { container } = render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={onClose} />)

    const backdrop = container.querySelector('[class*="bg-black"]') as HTMLElement
    fireEvent.click(backdrop)

    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(280)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe("TaskDetail スワイプ動作", () => {
  it("マウント時に body.style.overflow が hidden になる", () => {
    document.body.style.overflow = ""
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("アンマウント時に body.style.overflow が元に戻る", () => {
    document.body.style.overflow = "auto"
    const { unmount } = render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)
    unmount()
    expect(document.body.style.overflow).toBe("auto")
  })

  it("80px 以上スワイプで onClose が 280ms 後に呼ばれる", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={onClose} />)

    const panel = container.querySelector(".rounded-t-2xl") as HTMLElement
    act(() => {
      fireEvent.touchStart(panel, { touches: [{ clientY: 0 }] })
      fireEvent.touchMove(panel, { touches: [{ clientY: 90 }] })
      fireEvent.touchEnd(panel, { changedTouches: [{ clientY: 90 }] })
    })

    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(280) })
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("80px 未満スワイプでは onClose は呼ばれない", () => {
    const onClose = vi.fn()
    const { container } = render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={onClose} />)

    const panel = container.querySelector(".rounded-t-2xl") as HTMLElement
    fireEvent.touchStart(panel, { touches: [{ clientY: 0 }] })
    fireEvent.touchMove(panel, { touches: [{ clientY: 50 }] })
    fireEvent.touchEnd(panel, { changedTouches: [{ clientY: 50 }] })

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe("TaskDetail サブタスク", () => {
  it("allTasks の reverse-lookup で子タスクを一覧表示する", () => {
    const parent = makeTask({ id: "p", title: "親タスク" })
    const child = makeTask({ id: "c", title: "子タスクA", parentTaskIds: ["p"] })

    render(
      <TaskDetail
        tagOptions={TAG_OPTIONS}
        task={parent}
        allTasks={[parent, child]}
        onClose={() => {}}
      />,
    )

    const items = screen.getAllByTestId("subtask-item")
    expect(items).toHaveLength(1)
    expect(screen.getByText("子タスクA")).toBeInTheDocument()
  })

  it("childTaskIds に有り reverse-lookup にも有る子は重複表示しない", () => {
    const parent = makeTask({ id: "p", title: "親", childTaskIds: ["c"] })
    const child = makeTask({ id: "c", title: "子タスクA", parentTaskIds: ["p"] })

    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={parent} allTasks={[parent, child]} onClose={() => {}} />,
    )

    expect(screen.getAllByTestId("subtask-item")).toHaveLength(1)
  })

  it("子タスク行タップで onSelectTask がその子で呼ばれる", () => {
    const parent = makeTask({ id: "p", title: "親" })
    const child = makeTask({ id: "c", title: "子タスクA", parentTaskIds: ["p"] })
    const onSelectTask = vi.fn()

    render(
      <TaskDetail
        tagOptions={TAG_OPTIONS}
        task={parent}
        allTasks={[parent, child]}
        onSelectTask={onSelectTask}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByTestId("subtask-item"))
    expect(onSelectTask).toHaveBeenCalledWith(child)
  })

  it("親タスク行タップで onSelectTask がその親で呼ばれる", () => {
    const parent = makeTask({ id: "p", title: "親タスク" })
    const child = makeTask({ id: "c", title: "子", parentTaskIds: ["p"] })
    const onSelectTask = vi.fn()

    render(
      <TaskDetail
        tagOptions={TAG_OPTIONS}
        task={child}
        allTasks={[parent, child]}
        onSelectTask={onSelectTask}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByTestId("parent-task-item"))
    expect(onSelectTask).toHaveBeenCalledWith(parent)
  })

  it("allTasks に無い子 ID は getTasksByIdsAction で補完表示する", async () => {
    const fetched = makeTask({ id: "remote-c", title: "完了済み子タスク", status: "完了" })
    vi.mocked(getTasksByIdsAction).mockResolvedValueOnce([fetched])

    render(
      <TaskDetail
        tagOptions={TAG_OPTIONS}
        task={makeTask({ id: "p", childTaskIds: ["remote-c"] })}
        allTasks={[]}
        onClose={() => {}}
      />,
    )

    expect(await screen.findByText("完了済み子タスク")).toBeInTheDocument()
    expect(vi.mocked(getTasksByIdsAction)).toHaveBeenCalledWith(["remote-c"])
  })

  it("サブタスク追加ボタンで子タスク作成フォームが開く", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)

    expect(screen.queryByText("✦ New Subtask")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("subtask-add-button"))
    expect(screen.getByText("✦ New Subtask")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ADD SUBTASK/i })).toBeInTheDocument()
  })
})

describe("TaskDetail 親タスク変更", () => {
  it("親なし状態では「+ 親タスクを設定」ボタンが出る", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} onClose={() => {}} />)
    const button = screen.getByTestId("parent-set-button")
    expect(button).toHaveTextContent("+ 親タスクを設定")
  })

  it("親あり状態では「親タスクを変更」ボタンが出る", () => {
    const parent = makeTask({ id: "p", title: "親" })
    const child = makeTask({ id: "c", parentTaskIds: ["p"] })
    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={child} allTasks={[parent, child]} onClose={() => {}} />,
    )
    expect(screen.getByTestId("parent-set-button")).toHaveTextContent("親タスクを変更")
  })

  it("候補選択で updateTaskAction が parentTaskId 付きで呼ばれる", async () => {
    const self = makeTask({ id: "self" })
    const candidate = makeTask({ id: "cand", title: "候補タスク" })

    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={self} allTasks={[self, candidate]} onClose={() => {}} />,
    )

    fireEvent.click(screen.getByTestId("parent-set-button"))
    expect(screen.getByTestId("parent-picker-modal")).toBeInTheDocument()

    const candidateButton = screen.getByText("候補タスク").closest("button")!
    await act(async () => {
      fireEvent.click(candidateButton)
    })

    await waitFor(() => {
      expect(vi.mocked(updateTaskAction)).toHaveBeenCalledWith("self", { parentTaskId: "cand" })
    })
  })

  it("親を解除すると updateTaskAction が parentTaskId: null で呼ばれる", async () => {
    const parent = makeTask({ id: "p", title: "親" })
    const child = makeTask({ id: "c", parentTaskIds: ["p"] })

    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={child} allTasks={[parent, child]} onClose={() => {}} />,
    )

    fireEvent.click(screen.getByTestId("parent-set-button"))
    await act(async () => {
      fireEvent.click(screen.getByTestId("parent-picker-clear"))
    })

    await waitFor(() => {
      expect(vi.mocked(updateTaskAction)).toHaveBeenCalledWith("c", { parentTaskId: null })
    })
  })

  it("自タスクは候補に出ない", () => {
    const self = makeTask({ id: "self", title: "自分自身のタスク" })
    const other = makeTask({ id: "o", title: "他人のタスク" })

    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={self} allTasks={[self, other]} onClose={() => {}} />,
    )

    fireEvent.click(screen.getByTestId("parent-set-button"))
    const candidates = screen.getAllByTestId("parent-picker-candidate")
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toHaveAttribute("data-task-id", "o")
  })

  it("自タスクの子・孫は候補に出ない（循環防止）", () => {
    const self = makeTask({ id: "p" })
    const child = makeTask({ id: "c", title: "子", parentTaskIds: ["p"] })
    const grandchild = makeTask({ id: "g", title: "孫", parentTaskIds: ["c"] })
    const other = makeTask({ id: "o", title: "他人" })

    render(
      <TaskDetail
        tagOptions={TAG_OPTIONS}
        task={self}
        allTasks={[self, child, grandchild, other]}
        onClose={() => {}}
      />,
    )

    fireEvent.click(screen.getByTestId("parent-set-button"))
    const candidates = screen.getAllByTestId("parent-picker-candidate")
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toHaveAttribute("data-task-id", "o")
  })

  it("タイトル検索で候補が絞り込まれる", () => {
    const self = makeTask({ id: "self" })
    const tasks = [
      self,
      makeTask({ id: "a", title: "買い物リスト" }),
      makeTask({ id: "b", title: "ブログ執筆" }),
      makeTask({ id: "c", title: "買い替え検討" }),
    ]

    render(
      <TaskDetail tagOptions={TAG_OPTIONS} task={self} allTasks={tasks} onClose={() => {}} />,
    )

    fireEvent.click(screen.getByTestId("parent-set-button"))
    fireEvent.change(screen.getByTestId("parent-picker-search"), { target: { value: "買い" } })

    const candidates = screen.getAllByTestId("parent-picker-candidate")
    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.getAttribute("data-task-id"))).toEqual(["a", "c"])
  })

  it("親なしのとき「親を解除」ボタンは出ない", () => {
    render(<TaskDetail tagOptions={TAG_OPTIONS} task={makeTask()} allTasks={[]} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId("parent-set-button"))
    expect(screen.queryByTestId("parent-picker-clear")).not.toBeInTheDocument()
  })
})
