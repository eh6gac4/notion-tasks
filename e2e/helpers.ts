import type { BrowserContext, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export const BOARD = "[data-testid='task-board']"
export const TASK_ITEM = "[data-testid='task-item']"

export function COLUMN(status: string) {
  return `[data-testid='board-column'][data-status='${status}']`
}

export const AUTH_FILE = "e2e/.auth/user.json"

export async function setDefaultCookies(context: BrowserContext) {
  await context.addCookies([
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

// SW のインストールを抑止して、更新バナーがテスト中に「適用」ボタン等を
// インターセプトする flaky を排除する（pwa.spec.ts は本ヘルパー非経由で
// 直接 page.goto しているため影響しない）。
export async function disableServiceWorker(page: Page) {
  await page.route("**/sw.js", (route) => route.fulfill({ status: 404, body: "" }))
}

export async function resetAndOpenHome(page: Page) {
  await disableServiceWorker(page)
  await setDefaultCookies(page.context())
  await resetMockStore(page)
  await page.goto("/")
  await expect(page.locator(`${BOARD} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
  await waitForHydration(page)
}
