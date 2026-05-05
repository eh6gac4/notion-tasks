import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

const CENTER = "[data-testid='panel-center']"

test.describe("視覚回帰", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: "filter", value: "active", domain: "localhost", path: "/" },
      { name: "sort",   value: JSON.stringify({ key: "default", direction: "asc" }), domain: "localhost", path: "/" },
    ])
    await page.request.get("/api/dev/reset")
    await page.goto("/")
    await page.locator(`${CENTER} [data-testid='task-item']`).first().waitFor({ state: "visible", timeout: 15_000 })
  })

  test("home: filter=active", async ({ page }) => {
    await expect(page).toHaveScreenshot("home-mobile.png", { fullPage: true })
  })

  test("home: filter=all", async ({ page }) => {
    await page.locator("[data-testid='filter-select']").selectOption("all")
    await page.locator(`${CENTER} [data-testid='task-item']`).first().waitFor({ state: "visible", timeout: 10_000 })
    await expect(page).toHaveScreenshot("home-filter-all.png", { fullPage: true })
  })

  test("detail sheet", async ({ page }) => {
    await page.locator(`${CENTER} [data-testid='task-title']`).first().click()
    await page.locator("[data-testid='task-detail']").waitFor({ state: "visible", timeout: 5_000 })
    await expect(page).toHaveScreenshot("detail-sheet.png", { fullPage: true })
  })
})
