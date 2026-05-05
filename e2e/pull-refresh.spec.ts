import { test, expect } from "@playwright/test"
import type { CDPSession, Page } from "@playwright/test"
import { resetAndOpenHome } from "./helpers"

test.use({ storageState: "e2e/.auth/user.json" })

const PULL_INDICATOR = "[data-testid='pull-indicator']"

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
  // 中央パネルの上部付近を起点にする（最上部からの下方向プルを正しく再現するため）
  const box = await page.locator("[data-testid='task-list-main']").boundingBox()
  if (!box) throw new Error("task-list-main not found")
  return { sx: box.x + box.width / 2, sy: box.y + 40 }
}

test.describe("プル・トゥ・リフレッシュ", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await resetAndOpenHome(page)
  })

  test("インジケーターが DOM に存在する", async ({ page }) => {
    await expect(page.locator(PULL_INDICATOR)).toBeAttached()
  })

  test("最上部からの下方向プルでインジケーターが現れる", async ({ page, context }) => {
    const indicator = page.locator(PULL_INDICATOR)
    // 初期は不可視
    await expect(indicator).toHaveCSS("opacity", "0")

    const cdp = await context.newCDPSession(page)
    const { sx, sy } = await getSwipeOrigin(page)

    // touchStart → touchMove のみ送って中間状態のスタイルを確認するため、手動で touchEnd を遅延
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: sx, y: sy, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
    })
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: sx, y: sy + (200 * i) / 8, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 }],
      })
    }
    // touchEnd 前にインジケーターが見えていることを確認
    await expect(indicator).toHaveCSS("opacity", "1", { timeout: 1_000 })
    await expect(indicator).toHaveAttribute("data-ready", "true")

    // 後始末：touchEnd を発火してリフレッシュ起動
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ x: sx, y: sy + 200, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 0 }],
    })
  })

  test("中央パネルがスクロール下方の場合はインジケーターが現れない", async ({ page, context }) => {
    await page.evaluate(() => {
      const panel = document.querySelector("[data-testid='panel-center']") as HTMLElement
      panel.scrollTop = 100
    })

    const indicator = page.locator(PULL_INDICATOR)
    await expect(indicator).toHaveCSS("opacity", "0")

    const cdp = await context.newCDPSession(page)
    const { sx, sy } = await getSwipeOrigin(page)
    await swipe(cdp, sx, sy, 0, 200)

    // インジケーターは出現しないまま
    await page.waitForTimeout(300)
    await expect(indicator).toHaveCSS("opacity", "0")
  })
})
