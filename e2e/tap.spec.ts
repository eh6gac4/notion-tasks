import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

// 中央パネル（現在フィルター）のみを対象にするヘルパー
const CENTER = "[data-testid='panel-center']"

test.describe("タップ応答調査", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reset")
    await page.locator(`${CENTER} ul.divide-y li`).first().waitFor({ state: "visible", timeout: 15_000 })
  })

  test("タスクタイトルをタップするとボトムシートが開く", async ({ page }) => {
    const items = page.locator(`${CENTER} ul.divide-y li`)
    const count = await items.count()
    console.log(`  → タスク数: ${count}件`)

    // 先頭1件のタスクでボトムシートが開くか確認
    for (let i = 0; i < Math.min(count, 1); i++) {
      const titleEl = items.nth(i).locator("p").first()
      const box = await titleEl.boundingBox()
      console.log(`  → タスク${i + 1} タップ領域: ${JSON.stringify(box)}`)

      await titleEl.click()
      // ボトムシートのパネル（rounded-t-2xl）が表示されるのを待つ
      const sheet = page.locator("div.rounded-t-2xl").first()
      await sheet.waitFor({ state: "visible", timeout: 5_000 })
      const isVisible = await sheet.isVisible()
      console.log(`  → タスク${i + 1} ボトムシート表示: ${isVisible}`)
      expect(isVisible).toBe(true)

      // 閉じる（バックドロップをクリック）
      const backdrop = page.locator("div.bg-black\\/50")
      await backdrop.click({ position: { x: 10, y: 10 } })
      await sheet.waitFor({ state: "hidden", timeout: 5_000 })
    }
  })

  test("ステータスselectとタイトルボタンの重なりチェック", async ({ page }) => {
    const items = page.locator(`${CENTER} ul.divide-y li`)
    const firstItem = items.first()

    const titleEl = firstItem.locator("p").first()
    const statusSelect = firstItem.locator("select").first()

    const titleBox = await titleEl.boundingBox()
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

    const items = page.locator(`${CENTER} ul.divide-y li`)
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

  // WebKit / Chromium 共通: touches プロパティを手動付与した Event でスワイプをシミュレート
  async function dispatchSwipe(page: import("@playwright/test").Page, selector: string, dx: number, dy = 0) {
    const box = await page.locator(selector).boundingBox()
    if (!box) return
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.evaluate(([sel, startX, startY, deltaX, deltaY]) => {
      const el = document.querySelector(sel as string)!
      function makeTouch(x: number, y: number) {
        return { clientX: x, clientY: y, identifier: 1, target: el }
      }
      function fire(type: string, touches: object[], changed = touches) {
        const e = new Event(type, { bubbles: true, cancelable: true })
        Object.defineProperty(e, "touches",        { value: touches })
        Object.defineProperty(e, "targetTouches",  { value: touches })
        Object.defineProperty(e, "changedTouches", { value: changed })
        el.dispatchEvent(e)
      }
      fire("touchstart", [makeTouch(startX as number, startY as number)])
      fire("touchmove",  [makeTouch((startX as number) + (deltaX as number) / 2, (startY as number) + (deltaY as number) / 2)])
      fire("touchmove",  [makeTouch((startX as number) + (deltaX as number), (startY as number) + (deltaY as number))])
      fire("touchend",   [], [makeTouch((startX as number) + (deltaX as number), (startY as number) + (deltaY as number))])
    }, [selector, cx, cy, dx, dy])
  }

  test("左スワイプでフィルターが次に進む (active → todo)", async ({ page }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    expect(await filterSelect.inputValue()).toBe("active")

    await dispatchSwipe(page, "[data-testid='task-list-main']", -80)
    await expect(filterSelect).toHaveValue("todo", { timeout: 5_000 })
  })

  test("右スワイプでフィルターが前に戻る (todo → active)", async ({ page }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    await filterSelect.selectOption("todo")
    // スケルトン（ul li のみ）ではなくリアルタスク（ul li p）が表示されるまで待つ
    // これにより isPending=false（startTransition 完了）を確認できる
    await page.locator("ul.divide-y li p").first().waitFor({ state: "visible", timeout: 10_000 })

    await dispatchSwipe(page, "[data-testid='task-list-main']", 80)
    await expect(filterSelect).toHaveValue("active", { timeout: 5_000 })
  })

  test("縦スワイプではフィルターが変わらない", async ({ page }) => {
    const filterSelect = page.locator("[data-testid='filter-select']")
    const before = await filterSelect.inputValue()

    await dispatchSwipe(page, "[data-testid='task-list-main']", 20, 200)
    await page.waitForTimeout(400)
    expect(await filterSelect.inputValue()).toBe(before)
  })

  test("ページネーションドットが 6 個表示され、クリックでフィルターが変わる", async ({ page }) => {
    const dots = page.locator('[role="tab"]')
    await expect(dots).toHaveCount(6)

    const allDot = page.locator('[role="tab"][aria-label="すべて"]')
    await allDot.click()
    const filterSelect = page.locator("[data-testid='filter-select']")
    await expect(filterSelect).toHaveValue("all", { timeout: 5_000 })
  })
})
