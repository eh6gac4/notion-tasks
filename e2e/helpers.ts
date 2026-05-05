import type { BrowserContext, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export const CENTER = "[data-testid='panel-center']"
export const TASK_ITEM = "[data-testid='task-item']"

export const AUTH_FILE = "e2e/.auth/user.json"

export async function setDefaultCookies(context: BrowserContext) {
  await context.addCookies([
    { name: "filter", value: "active", domain: "localhost", path: "/" },
    { name: "sort", value: JSON.stringify({ key: "default", direction: "asc" }), domain: "localhost", path: "/" },
  ])
}

export async function resetMockStore(page: Page) {
  await page.request.get("/api/dev/reset")
}

export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === "1",
    null,
    { timeout: 5_000 },
  )
}

export async function resetAndOpenHome(page: Page) {
  await setDefaultCookies(page.context())
  await resetMockStore(page)
  await page.goto("/")
  await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
  await waitForHydration(page)
}
