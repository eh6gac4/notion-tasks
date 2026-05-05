import { test, expect } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"
import { AUTH_FILE, CENTER, TASK_ITEM, resetAndOpenHome } from "./helpers"

test.describe("タスク一覧", () => {
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
      const filterSelect = page.locator("[data-testid='filter-select']")
      if ((await filterSelect.inputValue()) !== "active") {
        await filterSelect.selectOption("active")
        await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })
      }
      const search = page.locator("[data-testid='search-input']")
      if ((await search.inputValue()) !== "") {
        await search.fill("")
        await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })
      }
    })

    test("タスクが表示される", async () => {
      const items = page.locator(`${CENTER} ${TASK_ITEM}`)
      const count = await items.count()
      expect(count).toBeGreaterThan(0)
    })

    test("フィルター切り替えでリストが変わる", async () => {
      const filterSelect = page.locator("[data-testid='filter-select']")

      await filterSelect.selectOption("all")
      await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })
      const allCount = await page.locator(`${CENTER} ${TASK_ITEM}`).count()
      expect(allCount).toBeGreaterThan(0)

      await filterSelect.selectOption("todo")
      await expect(page.locator(`${CENTER}`)).toContainText(/TASKS/, { timeout: 10_000 })
      const todoCount = await page.locator(`${CENTER} ${TASK_ITEM}`).count()
      expect(todoCount).toBeGreaterThanOrEqual(0)
      expect(todoCount).toBeLessThanOrEqual(allCount)
    })

    test("各タスクにステータスselectが存在する", async () => {
      const firstItem = page.locator(`${CENTER} ${TASK_ITEM}`).first()
      const statusSelect = firstItem.locator("select[aria-label='ステータスを変更']")
      await expect(statusSelect).toBeVisible()
      const value = await statusSelect.inputValue()
      expect(value).toBeTruthy()
    })

    test("検索入力でリストが絞り込まれる", async () => {
      const filterSelect = page.locator("[data-testid='filter-select']")
      await filterSelect.selectOption("all")
      await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })

      const initial = await page.locator(`${CENTER} ${TASK_ITEM}`).count()
      expect(initial).toBeGreaterThan(0)

      const firstTitle = await page.locator(`${CENTER} ${TASK_ITEM}`).first().textContent()
      const needle = (firstTitle ?? "").trim().slice(0, 2)
      expect(needle.length).toBeGreaterThan(0)

      const search = page.locator("[data-testid='search-input']")
      await search.fill(needle)

      await expect.poll(
        async () => page.locator(`${CENTER} ${TASK_ITEM}`).count(),
        { timeout: 5_000 },
      ).toBeLessThanOrEqual(initial)

      await search.fill("ZZZ_NO_MATCH_QUERY_ZZZ")
      await expect(page.locator(`${CENTER}`)).toContainText("— NO MATCH —", { timeout: 5_000 })

      await search.fill("")
      await expect(page.locator(`${CENTER} ${TASK_ITEM}`)).toHaveCount(initial, { timeout: 5_000 })
    })

    test("ソートシートで期限・降順を適用するとリストが並び替えられる", async () => {
      const filterSelect = page.locator("[data-testid='filter-select']")
      await filterSelect.selectOption("all")
      await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })

      // ソートボタンがビューポート内に収まっていること（スマホで見切れ回帰の検出）
      const sortBtnBox = await page.locator("[data-testid='sort-button']").boundingBox()
      const viewport = page.viewportSize()
      expect(sortBtnBox).not.toBeNull()
      expect(viewport).not.toBeNull()
      expect(sortBtnBox!.x + sortBtnBox!.width).toBeLessThanOrEqual(viewport!.width)

      const beforeTitles = await page.locator(`${CENTER} [data-testid='task-title']`).allInnerTexts()
      expect(beforeTitles.length).toBeGreaterThan(1)

      await page.locator("[data-testid='sort-button']").click()
      await expect(page.locator("[data-testid='task-sort-sheet']")).toBeVisible()
      await page.locator("[data-testid='sort-key-due']").click()
      await page.locator("[data-testid='sort-dir-desc']").click()
      await page.getByRole("button", { name: "適用" }).click()

      await expect(page.locator("[data-testid='sort-active-dot']")).toBeVisible()
      const afterTitles = await page.locator(`${CENTER} [data-testid='task-title']`).allInnerTexts()
      expect(afterTitles).not.toEqual(beforeTitles)

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

    test("作成シートで新規タグを追加するとリストの新タスクに反映される", async ({ page }) => {
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

      // 作成後、リストに当該タスクが現れる
      const newItem = page.locator(TASK_ITEM, { hasText: taskName })
      await expect(newItem).toBeVisible({ timeout: 10_000 })
      await expect(newItem).toContainText(tagName)
    })

    test("ステータスボタンクリックでバッジが楽観的更新される", async ({ page }) => {
      // mock-1 は「未着手」なので「→ 進行中」ボタンが表示される
      const firstItem = page.locator(`${CENTER} ${TASK_ITEM}`).first()
      const badge = firstItem.locator("[data-testid='task-status-badge']")
      await expect(badge).toHaveText("未着手")

      const nextBtn = firstItem.getByRole("button", { name: /進行中/ })
      await expect(nextBtn).toBeVisible()
      await nextBtn.click()

      await expect(badge).toHaveText("進行中", { timeout: 3_000 })
    })
  })
})
