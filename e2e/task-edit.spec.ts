import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

test.describe("タスク詳細編集", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("ul.divide-y li", { timeout: 15_000 })
  })

  test("ボトムシートにタイトル入力欄が表示される", async ({ page }) => {
    const firstItem = page.locator("ul.divide-y li").first()
    await firstItem.locator("p").first().click()

    const titleInput = page.locator('input[aria-label="タイトル"]')
    await expect(titleInput).toBeVisible({ timeout: 3_000 })
    const value = await titleInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test("Priority / 期限 / タグの編集UIが表示される", async ({ page }) => {
    const firstItem = page.locator("ul.divide-y li").first()
    await firstItem.locator("p").first().click()

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.locator('select').nth(1)).toBeVisible()
  })

  test("SAVE CHANGESボタンが存在しない（即時保存方式）", async ({ page }) => {
    const firstItem = page.locator("ul.divide-y li").first()
    await firstItem.locator("p").first().click()

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('button:has-text("SAVE CHANGES")')).not.toBeVisible()
  })
})
