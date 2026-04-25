import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

const CENTER = "[data-testid='panel-center']"
const TASK_ITEM = "[data-testid='task-item']"

async function resetAndWait(page: Page) {
  // フィルタークッキーを active にリセットしてから /reset へ遷移
  await page.context().addCookies([{ name: "filter", value: "active", domain: "localhost", path: "/" }])
  await page.goto("/reset")
  await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
}

test.describe("タスク一覧", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await resetAndWait(page)
  })

  test("タスクが表示される", async ({ page }) => {
    const items = page.locator(`${CENTER} ${TASK_ITEM}`)
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
  })

  test("フィルター切り替えでリストが変わる", async ({ page }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")

    // active → all
    await filterSelect.selectOption("all")
    await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })
    const allCount = await page.locator(`${CENTER} ${TASK_ITEM}`).count()
    expect(allCount).toBeGreaterThan(0)

    // all → todo（未着手のみ）
    await filterSelect.selectOption("todo")
    await expect(page.locator(`${CENTER}`)).toContainText(/TASKS/, { timeout: 10_000 })
    const todoCount = await page.locator(`${CENTER} ${TASK_ITEM}`).count()
    expect(todoCount).toBeGreaterThanOrEqual(0)
    expect(todoCount).toBeLessThanOrEqual(allCount)
  })

  test("各タスクにステータスselectが存在する", async ({ page }) => {
    const firstItem = page.locator(`${CENTER} ${TASK_ITEM}`).first()
    const statusSelect = firstItem.locator("select[aria-label='ステータスを変更']")
    await expect(statusSelect).toBeVisible()
    const value = await statusSelect.inputValue()
    expect(value).toBeTruthy()
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
