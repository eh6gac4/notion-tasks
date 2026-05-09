import { test, expect } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"
import { BOARD, COLUMN, TASK_ITEM, resetAndOpenHome } from "./helpers"

test.use({ storageState: "e2e/.auth/user.json" })

// VersionTag (ビルド時刻が毎回変わる) と DebugPanel (Server Action 計測でテスト中に
// 表示が変わる) は視覚回帰の対象外。撮影時にマスクして除外する。
function debugMasks(page: Page): Locator[] {
  return [page.locator("[data-testid='version-tag']"), page.locator("[data-testid='debug-panel']")]
}

test.describe("視覚回帰", () => {
  test.beforeEach(async ({ page }) => {
    await resetAndOpenHome(page)
  })

  test("board: 初期表示", async ({ page }) => {
    await expect(page).toHaveScreenshot("board-mobile.png", { fullPage: true, mask: debugMasks(page) })
  })

  test("board: 「進行中」カラムへスクロール", async ({ page }) => {
    const col = page.locator(COLUMN("進行中"))
    await col.scrollIntoViewIfNeeded()
    await expect(col.locator(TASK_ITEM).first()).toBeVisible({ timeout: 10_000 })
    // ボード内スクロール位置による微差を吸収するため一拍置く
    await page.waitForTimeout(150)
    await expect(page).toHaveScreenshot("board-doing-visible.png", { fullPage: true, mask: debugMasks(page) })
  })

  test("detail sheet", async ({ page }) => {
    await page.locator(`${BOARD} ${TASK_ITEM} [data-testid='task-title']`).first().click()
    await page.locator("[data-testid='task-detail']").waitFor({ state: "visible", timeout: 5_000 })
    await expect(page).toHaveScreenshot("detail-sheet.png", { fullPage: true, mask: debugMasks(page) })
  })
})
