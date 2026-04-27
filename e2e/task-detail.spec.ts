import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

const CENTER = "[data-testid='panel-center']"
const TASK_ITEM = "[data-testid='task-item']"

async function resetAndWait(page: Page) {
  await page.context().addCookies([{ name: "filter", value: "active", domain: "localhost", path: "/" }])
  await page.goto("/reset")
  await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
}

async function openFirstTaskDetail(page: Page) {
  const firstTitle = page.locator(`${CENTER} ${TASK_ITEM} [data-testid='task-title']`).first()
  await firstTitle.click()
  await expect(page.locator("[data-testid='task-detail']")).toBeVisible({ timeout: 5_000 })
}

test.describe("タスク詳細ボトムシート", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await resetAndWait(page)
  })

  test("タイトルをタップするとボトムシートが開く", async ({ page }) => {
    await openFirstTaskDetail(page)
    await expect(page.locator("[data-testid='task-detail']")).toBeVisible()
  })

  test("ボトムシートにタイトル入力欄が表示される", async ({ page }) => {
    await openFirstTaskDetail(page)

    const titleInput = page.locator('input[aria-label="タイトル"]')
    await expect(titleInput).toBeVisible({ timeout: 3_000 })
    const value = await titleInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test("Priority・期限の編集UIが表示される", async ({ page }) => {
    await openFirstTaskDetail(page)

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.locator('select[aria-label="期限の時"]')).toBeVisible()
    await expect(page.locator('select[aria-label="期限の分"]')).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
  })

  test("SAVE CHANGESボタンが存在しない（即時保存方式）", async ({ page }) => {
    await openFirstTaskDetail(page)

    await expect(page.locator('input[aria-label="タイトル"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('button:has-text("SAVE CHANGES")')).not.toBeVisible()
  })

  test("バックドロップをクリックするとボトムシートが閉じる", async ({ page }) => {
    await openFirstTaskDetail(page)

    const backdrop = page.locator("[data-testid='task-detail-backdrop']")
    await backdrop.click({ position: { x: 10, y: 10 } })

    await expect(page.locator("[data-testid='task-detail']")).not.toBeVisible({ timeout: 5_000 })
  })
})
