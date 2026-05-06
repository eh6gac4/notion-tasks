import { test, expect } from "@playwright/test"
import { BOARD, COLUMN, TASK_ITEM, resetAndOpenHome } from "./helpers"

test.use({ storageState: "e2e/.auth/user.json" })

test.describe("視覚回帰", () => {
  test.beforeEach(async ({ page }) => {
    await resetAndOpenHome(page)
  })

  test("board: 初期表示", async ({ page }) => {
    await expect(page).toHaveScreenshot("board-mobile.png", { fullPage: true })
  })

  test("board: 「進行中」カラムへスクロール", async ({ page }) => {
    const col = page.locator(COLUMN("進行中"))
    await col.scrollIntoViewIfNeeded()
    await expect(col.locator(TASK_ITEM).first()).toBeVisible({ timeout: 10_000 })
    // ボード内スクロール位置による微差を吸収するため一拍置く
    await page.waitForTimeout(150)
    await expect(page).toHaveScreenshot("board-doing-visible.png", { fullPage: true })
  })

  test("detail sheet", async ({ page }) => {
    await page.locator(`${BOARD} ${TASK_ITEM} [data-testid='task-title']`).first().click()
    await page.locator("[data-testid='task-detail']").waitFor({ state: "visible", timeout: 5_000 })
    await expect(page).toHaveScreenshot("detail-sheet.png", { fullPage: true })
  })
})
