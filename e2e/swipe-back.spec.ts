import { test, expect, type Locator } from '@playwright/test'
import { BOARD, TASK_ITEM, resetAndOpenHome } from './helpers'

// WebKit / Chromium 共通のタッチ列。スクロールとの方向判定とイベントの伝播も通す。
async function swipeBack(target: Locator) {
  await target.evaluate(el => {
    const y = Math.max(30, el.getBoundingClientRect().top + 20)
    const touch = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(10)] }))
    el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch(120)] }))
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(120)], touches: [] }))
  })
}

test.describe('各画面のスワイプバック', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'モバイルのタッチ操作')
    await resetAndOpenHome(page)
  })

  test('タスク詳細から一覧へ戻り、再度開いても戻れる', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.locator(`${BOARD} ${TASK_ITEM} [data-testid='task-title']`).first().click()
      const detail = page.getByTestId('task-detail')
      await expect(detail).toBeVisible()
      await swipeBack(detail)
      await expect(detail).toBeHidden()
      await expect(page).toHaveURL(/\/$/)
    }
  })

  for (const [label, testId] of [
    ['フィルタを開く', 'task-filter-sheet'],
    ['並び替えを開く', 'task-sort-sheet'],
    ['設定を開く', 'settings-sheet'],
  ]) {
    test(`${label}の画面から戻る`, async ({ page }) => {
      await page.getByRole('button', { name: label, exact: true }).click()
      const sheet = page.getByTestId(testId)
      await expect(sheet).toBeVisible()
      await swipeBack(sheet)
      await expect(sheet).toBeHidden()
      await expect(page).toHaveURL(/\/$/)
    })
  }

  test('タスク作成と関連タスク選択では最前面だけを閉じる', async ({ page }) => {
    await page.locator(`${BOARD} ${TASK_ITEM} [data-testid='task-title']`).first().click()
    const detail = page.getByTestId('task-detail')
    await expect(detail).toBeVisible()
    // 開く操作はスクロール位置に依存させず、戻る操作と親画面の保持を検証する。
    await page.getByTestId('prev-task-create-button').evaluate((el: HTMLButtonElement) => el.click())
    const form = page.locator('[data-swipe-back]').filter({ has: page.getByRole('heading', { name: '✦ New Prev Task', exact: true }) }).last()
    await expect(form).toBeVisible()
    await swipeBack(form)
    await expect(page.getByRole('heading', { name: '✦ New Prev Task', exact: true })).toBeHidden()
    await expect(detail).toBeVisible()

    await page.getByTestId('prev-task-set-button').evaluate((el: HTMLButtonElement) => el.click())
    const picker = page.getByTestId('picker-modal')
    await expect(picker).toBeVisible()
    await swipeBack(picker)
    await expect(picker).toBeHidden()
    await expect(detail).toBeVisible()
  })

  test('繰り返し設定から一覧、一覧から前のページへ戻る', async ({ page }) => {
    await page.getByRole('link', { name: 'repeat', exact: true }).click()
    await expect(page).toHaveURL(/\/recurring$/)
    await page.getByRole('button', { name: '+ New Rule', exact: true }).click()
    const form = page.locator('[data-swipe-back].fixed')
    await expect(form).toBeVisible()
    await swipeBack(form)
    await expect(form).toBeHidden()
    await expect(page).toHaveURL(/\/recurring$/)
    await swipeBack(page.getByRole('heading', { name: '✦ Recurring' }))
    await expect(page).toHaveURL(/\/$/)
  })

  test('メール詳細、AI返信、メール作成から一画面ずつ戻る', async ({ page }) => {
    await page.getByRole('link', { name: 'mail', exact: true }).click()
    await expect(page).toHaveURL(/\/mail$/)
    await page.locator('[role="option"]').first().click()
    const back = page.getByRole('button', { name: 'Back to List', exact: true })
    await expect(back).toBeVisible()
    await page.getByRole('button', { name: 'AI Draft Reply', exact: true }).click()
    const ai = page.getByTestId('ai-draft-modal')
    await expect(ai).toBeVisible()
    await swipeBack(ai)
    await expect(ai).toBeHidden()
    await expect(back).toBeVisible()
    await swipeBack(back)
    await expect(back).toBeHidden()
    await expect(page).toHaveURL(/\/mail$/)
    await page.locator('header').getByRole('button').click()
    const compose = page.getByTestId('compose-modal')
    await expect(compose).toBeVisible()
    await swipeBack(compose)
    await expect(compose).toBeHidden()
    await expect(page).toHaveURL(/\/mail$/)
  })
})
