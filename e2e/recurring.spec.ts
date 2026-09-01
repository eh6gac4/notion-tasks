import { test, expect } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"
import {
  AUTH_FILE,
  BOARD,
  TASK_ITEM,
  disableServiceWorker,
  resetMockStore,
  setDefaultCookies,
  waitForHydration,
} from "./helpers"

const RULE = "[data-testid='recurring-rule']"

test.describe("定期タスク", () => {
  test.describe.configure({ mode: "serial" })

  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: AUTH_FILE })
    page = await context.newPage()
    await disableServiceWorker(page)
    await setDefaultCookies(context)
  })

  test.afterAll(async () => {
    await context.close()
  })

  test.beforeEach(async () => {
    await resetMockStore(page)
    await page.goto("/recurring")
    await expect(page.locator(RULE).first()).toBeVisible({ timeout: 15_000 })
    await waitForHydration(page)
  })

  test("トップのヘッダから遷移できる", async () => {
    await page.goto("/")
    await expect(page.locator(`${BOARD} ${TASK_ITEM}`).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole("link", { name: "repeat" }).click()
    await expect(page.locator("[data-testid='recurring-manager']")).toBeVisible()
  })

  // モックの状態は dev サーバーのプロセスに残るため、件数の絶対値には依存しない。
  // 「対象のルールが期待どおり出ているか」だけを見る。
  test("既存のルールが繰り返し条件つきで一覧に出る", async () => {
    const gomi = page.locator(RULE).filter({ hasText: "燃えるゴミを出す" })
    await expect(gomi).toContainText("毎週 月・木曜")
    await expect(gomi).toContainText("07:00")

    const rent = page.locator(RULE).filter({ hasText: "家賃の振込" })
    await expect(rent).toContainText("毎月 27 日")
    await expect(rent).toContainText("3 日前に作成")
  })

  test("フォームは保存前に次回発生日をプレビューする", async () => {
    await page.locator("[data-testid='recurring-new']").click()
    await page.locator("[data-testid='recurring-title']").fill("毎月 1 日の点検")
    await page.getByLabel("頻度").selectOption("monthly")
    await page.getByLabel("日", { exact: true }).selectOption("1")

    const preview = page.locator("[data-testid='recurring-preview']")
    await expect(preview).toContainText("毎月 1 日")
    // 次回として 1 日の日付が 3 件並ぶ
    await expect(preview).toContainText(/次回: \d{4}-\d{2}-01/)
  })

  test("ルールを新規作成すると一覧に増える", async () => {
    const before = await page.locator(RULE).count()
    const title = `隔週レビュー ${Date.now()}`

    await page.locator("[data-testid='recurring-new']").click()
    await page.locator("[data-testid='recurring-title']").fill(title)
    await page.getByLabel("頻度").selectOption("weekly")
    await page.getByLabel("間隔").fill("2")
    await page.getByRole("button", { name: "金", exact: true }).click()
    await page.locator("[data-testid='recurring-submit']").click()

    await expect(page.locator(RULE)).toHaveCount(before + 1)
    await expect(page.locator(RULE).filter({ hasText: title })).toContainText("2 週ごと 金曜")
  })

  test("発生日が一度も無いルールは保存できない", async () => {
    await page.locator("[data-testid='recurring-new']").click()
    await page.locator("[data-testid='recurring-title']").fill("来ない日")
    await page.getByLabel("頻度").selectOption("yearly")
    await page.getByLabel("月", { exact: true }).selectOption("2")
    await page.getByLabel("日", { exact: true }).selectOption("30")

    // 理由をプレビュー欄に出したうえで、保存ボタン自体を押せなくする
    await expect(page.locator("[data-testid='recurring-preview']")).toContainText("発生日が一度もありません")
    await expect(page.locator("[data-testid='recurring-submit']")).toBeDisabled()
  })

  test("on/off を切り替えられる", async () => {
    const target = page.locator(RULE).filter({ hasText: "家賃の振込" })
    const before = await target.getAttribute("data-enabled")
    await target.getByRole("button", { name: before === "1" ? "on" : "off" }).click()
    await expect(target).toHaveAttribute("data-enabled", before === "1" ? "0" : "1")
  })

  // 生成は冪等。二度目に何も増えないことがこの機能の肝なので、そこだけを見る。
  test("今すぐ生成は二度目に何も作らない", async () => {
    const manager = page.locator("[data-testid='recurring-manager']")

    await page.locator("[data-testid='recurring-run-now']").click()
    await expect(manager).toContainText(/件のタスクを生成しました|生成対象はありませんでした/)

    await page.locator("[data-testid='recurring-run-now']").click()
    await expect(manager).toContainText("生成対象はありませんでした")
  })
})
