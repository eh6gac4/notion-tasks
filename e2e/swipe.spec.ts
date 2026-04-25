import { test, expect } from "@playwright/test"
import type { Page, CDPSession } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

const CENTER = "[data-testid='panel-center']"
const TASK_ITEM = "[data-testid='task-item']"

async function resetAndWait(page: Page) {
  await page.context().addCookies([{ name: "filter", value: "active", domain: "localhost", path: "/" }])
  await page.goto("/reset")
  await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
  // バックグラウンドプリフェッチ（隣接パネル取得）が完了するまで待つ
  await page.waitForLoadState("networkidle")
}

// CDP Input.dispatchTouchEvent でスワイプをシミュレート（Chromium のみ）
async function swipe(cdp: CDPSession, sx: number, sy: number, dx: number, dy = 0) {
  const STEPS = 8
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: sx, y: sy, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
  })
  for (let i = 1; i <= STEPS; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: sx + (dx * i) / STEPS, y: sy + (dy * i) / STEPS, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    })
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [{ x: sx + dx, y: sy + dy, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 0 }],
  })
}

async function getSwipeOrigin(page: Page) {
  const box = await page.locator("[data-testid='task-list-main']").boundingBox()
  if (!box) throw new Error("task-list-main not found")
  return { sx: box.x + box.width / 2, sy: box.y + box.height / 2 }
}

test.describe("スワイプナビゲーション", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await resetAndWait(page)
  })

  test("左スワイプでフィルターが次に進む (active → todo)", async ({ page, context }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    await expect(filterSelect).toHaveValue("active")

    const cdp = await context.newCDPSession(page)
    const { sx, sy } = await getSwipeOrigin(page)
    await swipe(cdp, sx, sy, -100)

    await expect(filterSelect).toHaveValue("todo", { timeout: 5_000 })
  })

  test("右スワイプでフィルターが前に戻る (todo → active)", async ({ page, context }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    await filterSelect.selectOption("todo")
    await expect(page.locator(`${CENTER} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 10_000 })

    const cdp = await context.newCDPSession(page)
    const { sx, sy } = await getSwipeOrigin(page)
    await swipe(cdp, sx, sy, 100)

    await expect(filterSelect).toHaveValue("active", { timeout: 5_000 })
  })

  test("縦スワイプではフィルターが変わらない", async ({ page, context }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    await expect(filterSelect).toHaveValue("active")

    const cdp = await context.newCDPSession(page)
    const { sx, sy } = await getSwipeOrigin(page)
    await swipe(cdp, sx, sy, 20, 200)
    await page.waitForTimeout(400)

    await expect(filterSelect).toHaveValue("active")
  })

  test("ページネーションドットが 6 個表示される", async ({ page }) => {
    const dots = page.locator('[role="tab"]')
    await expect(dots).toHaveCount(6)
  })

  test("ドットをクリックするとフィルターが変わる", async ({ page }) => {
    const allDot = page.locator('[role="tab"][aria-label="すべて"]')
    await expect(allDot).toBeVisible()
    await allDot.click()

    const filterSelect = page.locator("[data-testid='filter-select']")
    await expect(filterSelect).toHaveValue("all", { timeout: 5_000 })
  })
})
