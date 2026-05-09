import { test, expect } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"
import { AUTH_FILE, BOARD, COLUMN, TASK_ITEM, resetAndOpenHome } from "./helpers"

test.describe("ボード", () => {
  test.describe("読み取り系", () => {
    test.describe.configure({ mode: "serial" })

    let context: BrowserContext
    let page: Page

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({ storageState: AUTH_FILE })
      page = await context.newPage()
      await resetAndOpenHome(page)
    })

    test.afterAll(async () => {
      await context.close()
    })

    test.beforeEach(async () => {
      // タスクストアは触らず、UI 状態だけ初期化
      const search = page.locator("[data-testid='search-input']")
      if ((await search.inputValue()) !== "") {
        await search.fill("")
        await expect(page.locator(`${BOARD} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })
      }
    })

    test("ボードに 5 カラムが描画される (進行中/未着手 はマージ)", async () => {
      // 各 status 名が必ずいずれかのカラムに含まれる (進行中/未着手 は同一カラム)
      const expected = ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"]
      for (const status of expected) {
        await expect(page.locator(COLUMN(status)).first()).toBeVisible()
      }
      const count = await page.locator("[data-testid='board-column']").count()
      expect(count).toBe(5)
    })

    test("少なくとも1つのタスクが描画される", async () => {
      const items = page.locator(`${BOARD} ${TASK_ITEM}`)
      const count = await items.count()
      expect(count).toBeGreaterThan(0)
    })

    test("各タスクカードに status 変更用 select が存在する", async () => {
      const firstItem = page.locator(`${BOARD} ${TASK_ITEM}`).first()
      const statusSelect = firstItem.locator("select[aria-label='ステータスを変更']")
      await expect(statusSelect).toBeAttached()
      const value = await statusSelect.inputValue()
      expect(value).toBeTruthy()
    })

    test("検索入力で全カラム横断にリストが絞り込まれる", async () => {
      const initial = await page.locator(`${BOARD} ${TASK_ITEM}`).count()
      expect(initial).toBeGreaterThan(0)

      const firstTitle = await page.locator(`${BOARD} ${TASK_ITEM}`).first().textContent()
      const needle = (firstTitle ?? "").trim().slice(0, 2)
      expect(needle.length).toBeGreaterThan(0)

      const search = page.locator("[data-testid='search-input']")
      await search.fill(needle)

      await expect.poll(
        async () => page.locator(`${BOARD} ${TASK_ITEM}`).count(),
        { timeout: 5_000 },
      ).toBeLessThanOrEqual(initial)

      await search.fill("ZZZ_NO_MATCH_QUERY_ZZZ")
      // 全カラムが NO MATCH を表示する
      await expect(page.locator(BOARD).getByText("— NO MATCH —").first()).toBeVisible({ timeout: 5_000 })

      await search.fill("")
      await expect(page.locator(`${BOARD} ${TASK_ITEM}`)).toHaveCount(initial, { timeout: 5_000 })
    })

    test("ソートシートでの適用が sort-active-dot に反映される（順序ロジックは単体テストで網羅）", async () => {
      // ソートボタンがビューポート内に収まっていること（スマホで見切れ回帰の検出）
      const sortBtnBox = await page.locator("[data-testid='sort-button']").boundingBox()
      const viewport = page.viewportSize()
      expect(sortBtnBox).not.toBeNull()
      expect(viewport).not.toBeNull()
      expect(sortBtnBox!.x + sortBtnBox!.width).toBeLessThanOrEqual(viewport!.width)

      await page.locator("[data-testid='sort-button']").click()
      await expect(page.locator("[data-testid='task-sort-sheet']")).toBeVisible()
      await page.locator("[data-testid='sort-key-due']").click()
      await page.locator("[data-testid='sort-dir-desc']").click()
      await page.getByRole("button", { name: "適用" }).click()

      await expect(page.locator("[data-testid='sort-active-dot']")).toBeVisible()

      // リセットして元の挙動に戻る
      await page.locator("[data-testid='sort-button']").click()
      await page.getByRole("button", { name: "リセット" }).click()
      await page.getByRole("button", { name: "適用" }).click()
      await expect(page.locator("[data-testid='sort-active-dot']")).toHaveCount(0)
    })
  })

  test.describe("変更系", () => {
    test.describe.configure({ mode: "serial" })

    test.beforeEach(async ({ page }) => {
      await resetAndOpenHome(page)
    })

    test("作成シートで新規タグを追加するとカードに反映される", async ({ page }) => {
      // dev サーバー内のモックストアは複数テスト間で共有されるため、Date.now() で一意化
      const tagName = `e2e-tag-${Date.now()}`
      const taskName = `タグ追加検証-${tagName}`

      await page.getByRole("button", { name: "タスクを追加" }).click()
      await expect(page.getByText("✦ New Task")).toBeVisible()

      await page.getByPlaceholder(/TASK NAME/).fill(taskName)
      await page.getByLabel("新しいタグを追加").fill(tagName)
      await page.getByRole("button", { name: "タグを追加" }).click()

      // 新タグが選択済みピルとして並ぶ
      await expect(page.getByRole("button", { name: tagName })).toBeVisible()

      await page.getByRole("button", { name: /CREATE TASK/i }).click()

      // 作成後、ボードに当該タスクが現れる（新規作成は status=未着手 がデフォルト）
      const newItem = page.locator(`${COLUMN("未着手")} ${TASK_ITEM}`, { hasText: taskName })
      await expect(newItem).toBeVisible({ timeout: 10_000 })
      await expect(newItem).toContainText(tagName)
    })

    test("カードの ⋮ → ステータス変更で他カラムへ移動する", async ({ page }) => {
      // 進行中/未着手は同一カラムなので、別カラムへの遷移を 確認中 で検証する
      const wipCol = page.locator(COLUMN("未着手"))
      const card = wipCol.locator(TASK_ITEM).first()
      const title = await card.locator("[data-testid='task-title']").innerText()
      expect(title.length).toBeGreaterThan(0)

      const select = card.locator("select[aria-label='ステータスを変更']")
      await select.selectOption("確認中")

      // 同名のカードが「確認中」カラムに移動していることを確認
      const movedCard = page.locator(`${COLUMN("確認中")} ${TASK_ITEM}`, { hasText: title })
      await expect(movedCard).toBeVisible({ timeout: 5_000 })
      await expect(wipCol.locator(TASK_ITEM, { hasText: title })).toHaveCount(0, { timeout: 5_000 })
    })
  })
})
