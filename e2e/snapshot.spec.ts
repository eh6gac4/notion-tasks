import { test } from "@playwright/test"
import path from "path"

const DIR = process.env.SNAPSHOT_DIR ?? "before"

test("スナップショット撮影", async ({ page }) => {
  await page.goto("/")
  await page.waitForSelector("[data-testid='task-list'], ul, main", { timeout: 10000 })
  await page.waitForTimeout(1000)

  const outDir = path.join("e2e/snapshots", DIR)

  await page.screenshot({
    path: `${outDir}/home-mobile.png`,
    fullPage: true,
  })

  // フィルター変更
  await page.selectOption("select", "all")
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${outDir}/home-filter-all.png`, fullPage: true })

  // ボトムシート
  const firstTask = page.locator("ul li button").first()
  if (await firstTask.isVisible()) {
    await firstTask.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outDir}/detail-sheet.png`, fullPage: true })
    await page.keyboard.press("Escape")
  }
})
