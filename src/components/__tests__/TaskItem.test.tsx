import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskItem } from "@/components/TaskItem"
import { formatDueShort } from "@/lib/due-date"
import type { Task } from "@/types/task"

vi.mock("@/app/actions", () => ({
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
}))

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

describe("TaskItem レンダリング", () => {
  it("タスクのタイトルを表示する", () => {
    render(<TaskItem task={makeTask({ title: "買い物リスト" })} onSelect={vi.fn()} />)
    expect(screen.getByText("買い物リスト")).toBeInTheDocument()
  })

  it("ステータスバッジを表示する", () => {
    render(<TaskItem task={makeTask({ status: "進行中" })} onSelect={vi.fn()} />)
    // badge span と select 内の option の両方があるため getAllBy
    expect(screen.getAllByText("進行中").length).toBeGreaterThan(0)
  })

  it("status が null の場合「未着手」バッジを表示する", () => {
    render(<TaskItem task={makeTask({ status: null })} onSelect={vi.fn()} />)
    expect(screen.getAllByText("未着手").length).toBeGreaterThan(0)
  })

  it("priority が high の場合「🚨 High」を表示する", () => {
    render(<TaskItem task={makeTask({ priority: "high" })} onSelect={vi.fn()} />)
    expect(screen.getByText("🚨 High")).toBeInTheDocument()
  })

  it("priority が medium の場合「⚠️ Med」を表示する", () => {
    render(<TaskItem task={makeTask({ priority: "medium" })} onSelect={vi.fn()} />)
    expect(screen.getByText("⚠️ Med")).toBeInTheDocument()
  })

  it("priority が low の場合「💤 Low」を表示する", () => {
    render(<TaskItem task={makeTask({ priority: "low" })} onSelect={vi.fn()} />)
    expect(screen.getByText("💤 Low")).toBeInTheDocument()
  })

  it("priority が null の場合は優先度ラベルを表示しない", () => {
    render(<TaskItem task={makeTask({ priority: null })} onSelect={vi.fn()} />)
    expect(screen.queryByText("🚨 High")).not.toBeInTheDocument()
    expect(screen.queryByText("⚠️ Med")).not.toBeInTheDocument()
    expect(screen.queryByText("💤 Low")).not.toBeInTheDocument()
  })

  it("due date が未来の場合は日付のみを表示する（⚠ なし）", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const due = futureDate.toISOString().split("T")[0]
    render(<TaskItem task={makeTask({ due })} onSelect={vi.fn()} />)
    const dueDateEl = screen.getByText(formatDueShort(due))
    expect(dueDateEl).toBeInTheDocument()
    expect(dueDateEl.textContent).not.toContain("⚠")
  })

  it("due date が過去の場合は⚠プレフィックスで表示する（期限切れ）", () => {
    render(<TaskItem task={makeTask({ due: "2020-01-01" })} onSelect={vi.fn()} />)
    const els = screen.getAllByText(/⚠/)
    expect(els.length).toBeGreaterThan(0)
  })

  it("時刻付き due は MM/DD HH:mm を表示する", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const yyyy = futureDate.getFullYear()
    const mm = String(futureDate.getMonth() + 1).padStart(2, "0")
    const dd = String(futureDate.getDate()).padStart(2, "0")
    const due = `${yyyy}-${mm}-${dd}T18:30:00.000+09:00`
    render(<TaskItem task={makeTask({ due })} onSelect={vi.fn()} />)
    // ローカル TZ により表示時刻はずれうるが MM/DD HH:mm 形式であることだけ確認
    const formatted = screen.getByText(/^\d{2}\/\d{2} \d{2}:\d{2}$/)
    expect(formatted).toBeInTheDocument()
  })

  it("due が null の場合は日付表示なし", () => {
    render(<TaskItem task={makeTask({ due: null })} onSelect={vi.fn()} />)
    // 日付っぽいテキストがないことを確認（月/日 形式）
    expect(screen.queryByText(/\d+月\d+日/)).not.toBeInTheDocument()
  })

  it("タグを最大2件まで表示する", () => {
    render(
      <TaskItem task={makeTask({ tags: ["Tech", "Blog", "Finance"] })} onSelect={vi.fn()} />
    )
    expect(screen.getByText("Tech")).toBeInTheDocument()
    expect(screen.getByText("Blog")).toBeInTheDocument()
    expect(screen.queryByText("Finance")).not.toBeInTheDocument()
  })

  it("子タスク数を表示する", () => {
    render(
      <TaskItem task={makeTask({ childTaskIds: ["c1", "c2", "c3"] })} onSelect={vi.fn()} />
    )
    expect(screen.getByText("子3件")).toBeInTheDocument()
  })

  it("子タスクがない場合は子タスク数を表示しない", () => {
    render(<TaskItem task={makeTask({ childTaskIds: [] })} onSelect={vi.fn()} />)
    expect(screen.queryByText(/子\d+件/)).not.toBeInTheDocument()
  })
})

describe("TaskItem STATUS_STYLES 網羅性", () => {
  // 各ステータスに対してバッジが表示されることを確認（スタイル抽出後の回帰防止）
  const statuses = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止", "アーカイブ済み"] as const

  for (const status of statuses) {
    it(`"${status}" でクラッシュしない`, () => {
      expect(() =>
        render(<TaskItem task={makeTask({ status })} onSelect={vi.fn()} />)
      ).not.toThrow()
    })
  }
})
