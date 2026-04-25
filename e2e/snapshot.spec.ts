import { test } from "@playwright/test"
import path from "path"

const DIR = process.env.SNAPSHOT_DIR ?? "before"
const CENTER = "[data-testid='panel-center']"

// スクリーンショット撮影ユーティリティ（アサーションなし）
test("スナップショット撮影", async ({ page }) => {
  await page.context().addCookies([{ name: "filter", value: "active", domain: "localhost", path: "/" }])
  await page.goto("/reset")
  await page.locator(`${CENTER} [data-testid='task-item']`).first().waitFor({ state: "visible", timeout: 15_000 })

  const outDir = path.join("e2e/snapshots", DIR)

  await page.screenshot({ path: `${outDir}/home-mobile.png`, fullPage: true })

  await page.locator("[data-testid='filter-select']").selectOption("all")
  await page.locator(`${CENTER} [data-testid='task-item']`).first().waitFor({ state: "visible", timeout: 10_000 })
  await page.screenshot({ path: `${outDir}/home-filter-all.png`, fullPage: true })

  const firstTitle = page.locator(`${CENTER} [data-testid='task-title']`).first()
  if (await firstTitle.isVisible()) {
    await firstTitle.click()
    await page.locator("[data-testid='task-detail']").waitFor({ state: "visible", timeout: 5_000 })
    await page.screenshot({ path: `${outDir}/detail-sheet.png`, fullPage: true })
    await page.locator("[data-testid='task-detail-backdrop']").click({ position: { x: 10, y: 10 } })
    await page.locator("[data-testid='task-detail']").waitFor({ state: "hidden", timeout: 5_000 })
  }
})
