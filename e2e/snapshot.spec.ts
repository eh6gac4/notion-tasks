import { test } from "@playwright/test"
import path from "path"

const DIR = process.env.SNAPSHOT_DIR ?? "before"

test("スナップショット撮影", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector("[data-testid='task-list'], ul, main", { timeout: 10000 })
  await page.waitForLoadState("networkidle")

  const outDir = path.join("e2e/snapshots", DIR)

  await page.screenshot({
    path: `${outDir}/home-mobile.png`,
    fullPage: true,
  })

  // フィルター変更（data-testid でフィルター専用 select を明示指定）
  await page.locator("[data-testid='filter-select']").selectOption("all")
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: `${outDir}/home-filter-all.png`, fullPage: true })

  // ボトムシート（バックドロップクリックで閉じる）
  const firstTask = page.locator("ul li button").first()
  if (await firstTask.isVisible()) {
    await firstTask.click()
    await page.waitForSelector('[class*="translate-y"]')
    await page.screenshot({ path: `${outDir}/detail-sheet.png`, fullPage: true })
    const backdrop = page.locator('[class*="bg-black\\/50"]')
    await page.mouse.click(10, 10)
    await backdrop.waitFor({ state: "hidden" })
  }
})
