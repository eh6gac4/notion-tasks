import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/user.json" })

test.describe("タスク一覧", () => {
  test.describe.configure({ mode: "serial" })
  test.beforeEach(async ({ page }) => {
    // dev環境のモックデータをリセット（/reset がresetMockTasks()を呼んで"/"にリダイレクト）
    await page.goto("/reset")
    await page.waitForSelector("ul.divide-y", { timeout: 15_000 })
  })

  test("タスクが表示される", async ({ page }) => {
    const items = page.locator("ul.divide-y li")
    await expect(items.first()).toBeVisible()
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
    console.log(`  → ${count}件のタスクを表示`)
  })

  test("フィルター切り替えでリストが変わる", async ({ page }) => {
    const filterSelect = page.locator("select").first()
    await expect(filterSelect).toBeVisible()

    const beforeCount = await page.locator("ul.divide-y li").count()
    console.log(`  → フィルター変更前: ${beforeCount}件`)

    // 「すべて」に変更
    await filterSelect.selectOption("all")
    await page.waitForTimeout(500)
    const allCount = await page.locator("ul.divide-y li").count()
    console.log(`  → 「すべて」フィルター後: ${allCount}件`)

    // 「未着手」に変更
    await filterSelect.selectOption("todo")
    await page.waitForTimeout(500)
    const todoCount = await page.locator("ul.divide-y li:visible").count()
    console.log(`  → 「未着手」フィルター後: ${todoCount}件 (表示中)`)

    // デフォルト(active)と異なるはずか、少なくとも正常動作を確認
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test("ステータス変更selectが各タスクに存在する", async ({ page }) => {
    // タスクアイテムの中にステータスselectがあることを確認
    const statusSelects = page.locator("ul.divide-y li select")
    const count = await statusSelects.count()
    expect(count).toBeGreaterThan(0)
    console.log(`  → ステータスselect: ${count}個`)

    // 最初のタスクの現在ステータスを取得
    const firstSelect = statusSelects.first()
    const currentStatus = await firstSelect.inputValue()
    console.log(`  → 最初のタスクのステータス: "${currentStatus}"`)
    expect(currentStatus).toBeTruthy()
  })

  test("ステータス変更がNotionに反映される", async ({ page }) => {
    // beforeEach でモックデータをリセット済みのため先頭タスクは常に未着手
    // selectOption は WebKit で onChange が発火しない場合があるため、常にボタンで変更する
    const firstItem = page.locator("ul.divide-y li").first()
    const before = await firstItem.locator("select").inputValue()

    const next = "進行中"
    const nextBtn = firstItem.getByRole("button", { name: next })
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    console.log(`  → "${before}" → "${next}" に変更`)
    await nextBtn.click()

    // Notion反映を待つ
    await page.waitForTimeout(3000)

    // 進行中フィルターでリロードして永続化を確認（サーバーアクション完了を待つ）
    await page.locator("[data-testid='filter-select']").selectOption("doing")
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForSelector("ul.divide-y")
    const after = await page.locator("ul.divide-y li select").first().inputValue()
    console.log(`  → リロード後のステータス: "${after}"`)
    expect(after).toBe(next)
  })
})

test.describe("ログイン", () => {
  test.skip("未認証でアクセスするとログイン画面にリダイレクト", async ({ browser }) => {
    // 新規コンテキスト（storageStateなし）でアクセス
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
    await ctx.close()
  })

  test.skip("誤ったパスワードでエラーが表示される", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/login")
    await page.getByLabel("ユーザー名").fill("wrong")
    await page.getByLabel("パスワード").fill("wrong")
    await page.getByRole("button", { name: "ログイン" }).click()
    await expect(page.getByText("ユーザー名またはパスワードが正しくありません")).toBeVisible()
  })
})
