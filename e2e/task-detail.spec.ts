import { test, expect } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"
import { AUTH_FILE, BOARD, TASK_ITEM, resetAndOpenHome } from "./helpers"

const TASK_DETAIL = "[data-testid='task-detail']"
const TASK_DETAIL_BACKDROP = "[data-testid='task-detail-backdrop']"

test.describe("タスク詳細ボトムシート", () => {
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
    const detail = page.locator(TASK_DETAIL)
    if (await detail.isVisible().catch(() => false)) {
      await page.locator(TASK_DETAIL_BACKDROP).click({ position: { x: 10, y: 10 } })
      await detail.waitFor({ state: "hidden", timeout: 5_000 })
    }
  })

  async function openFirstTaskDetail() {
    const firstTitle = page.locator(`${BOARD} ${TASK_ITEM} [data-testid='task-title']`).first()
    await firstTitle.click()
    await expect(page.locator(TASK_DETAIL)).toBeVisible({ timeout: 5_000 })
  }

  test("タイトルをタップするとボトムシートが開く", async () => {
    await openFirstTaskDetail()
    await expect(page.locator(TASK_DETAIL)).toBeVisible()
  })

  test("ボトムシートにタイトル入力欄が表示される", async () => {
    await openFirstTaskDetail()

    const titleInput = page.locator('input[aria-label="タイトル"]')
    await expect(titleInput).toBeVisible({ timeout: 3_000 })
    const value = await titleInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test("Priority・期限の編集UIが表示される", async () => {
    await openFirstTaskDetail()

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.locator('input[aria-label="期限の時刻"]')).toBeVisible()
    await expect(page.locator("[data-testid='priority-select']")).toBeVisible()
  })

  test("SAVE CHANGESボタンが存在しない（即時保存方式）", async () => {
    await openFirstTaskDetail()

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('button:has-text("SAVE CHANGES")')).not.toBeVisible()
  })

  test("バックドロップをクリックするとボトムシートが閉じる", async () => {
    await openFirstTaskDetail()

    const backdrop = page.locator(TASK_DETAIL_BACKDROP)
    await backdrop.click({ position: { x: 10, y: 10 } })

    await expect(page.locator(TASK_DETAIL)).not.toBeVisible({ timeout: 5_000 })
  })
})
