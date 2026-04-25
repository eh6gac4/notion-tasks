import { test } from "@playwright/test"
import path from "path"

const DIR = process.env.SNAPSHOT_DIR ?? "before"
const CENTER = "[data-testid='panel-center']"

test("スナップショット撮影", async ({ page }) => {
  await page.goto("/")
  await page.locator(`${CENTER} ul.divide-y li`).first().waitFor({ state: "visible", timeout: 15_000 })

  const outDir = path.join("e2e/snapshots", DIR)

  await page.screenshot({
    path: `${outDir}/home-mobile.png`,
    fullPage: true,
  })

  // フィルター変更（data-testid でフィルター専用 select を明示指定）
  await page.locator("[data-testid='filter-select']").selectOption("all")
  await page.locator(`${CENTER} ul.divide-y li`).first().waitFor({ state: "visible", timeout: 10_000 })
  await page.screenshot({ path: `${outDir}/home-filter-all.png`, fullPage: true })

  // ボトムシート（中央パネルのボタンを対象にする）
  const firstTask = page.locator(`${CENTER} ul li button`).first()
  if (await firstTask.isVisible()) {
    await firstTask.click()
    await page.locator("div.rounded-t-2xl").first().waitFor({ state: "visible" })
    await page.screenshot({ path: `${outDir}/detail-sheet.png`, fullPage: true })
    await page.mouse.click(10, 10)
    await page.locator("div.bg-black\\/50").waitFor({ state: "hidden" })
  }
})
