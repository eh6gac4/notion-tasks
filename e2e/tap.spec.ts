import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

test.describe("タップ応答調査", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("ul.divide-y li", { timeout: 15_000 })
  })

  test("タスクタイトルをタップするとボトムシートが開く", async ({ page }) => {
    const items = page.locator("ul.divide-y li")
    const count = await items.count()
    console.log(`  → タスク数: ${count}件`)

    // 全タスクをタップしてボトムシートが開くか確認
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = items.nth(i).locator("button").first()
      const box = await btn.boundingBox()
      console.log(`  → タスク${i + 1} タップ領域: ${JSON.stringify(box)}`)

      await btn.click()
      const sheet = page.locator('[class*="translate-y"]').first()
      const isVisible = await sheet.isVisible().catch(() => false)
      console.log(`  → タスク${i + 1} ボトムシート表示: ${isVisible}`)
      expect(isVisible).toBe(true)

      // 閉じる（ボトムシートに被らないよう左上をクリック）
      await page.locator('[class*="bg-black\\/50"]').click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(400)
    }
  })

  test("ステータスselectとタイトルボタンの重なりチェック", async ({ page }) => {
    const items = page.locator("ul.divide-y li")
    const firstItem = items.first()

    const titleBtn = firstItem.locator("button").first()
    const statusSelect = firstItem.locator("select").first()

    const titleBox = await titleBtn.boundingBox()
    const selectBox = await statusSelect.boundingBox()

    console.log(`  → タイトルボタン: ${JSON.stringify(titleBox)}`)
    console.log(`  → ステータスselect: ${JSON.stringify(selectBox)}`)

    // 重なりがないか確認
    if (titleBox && selectBox) {
      const overlap = !(
        titleBox.x + titleBox.width < selectBox.x ||
        selectBox.x + selectBox.width < titleBox.x ||
        titleBox.y + titleBox.height < selectBox.y ||
        selectBox.y + selectBox.height < titleBox.y
      )
      console.log(`  → 重なりあり: ${overlap}`)
      expect(overlap).toBe(false)
    }
  })

  test("FABがタスクアイテムを覆っていないか確認", async ({ page }) => {
    const fab = page.locator('[aria-label="タスクを追加"]')
    const fabBox = await fab.boundingBox()
    console.log(`  → FAB位置: ${JSON.stringify(fabBox)}`)

    const items = page.locator("ul.divide-y li")
    const count = await items.count()
    const lastItem = items.nth(count - 1)
    const lastBox = await lastItem.boundingBox()
    console.log(`  → 最後のタスク位置: ${JSON.stringify(lastBox)}`)

    if (fabBox && lastBox) {
      const overlap = !(
        fabBox.x + fabBox.width < lastBox.x ||
        lastBox.x + lastBox.width < fabBox.x ||
        fabBox.y + fabBox.height < lastBox.y ||
        lastBox.y + lastBox.height < fabBox.y
      )
      console.log(`  → FABとタスクが重なっている: ${overlap}`)
    }
  })
})
