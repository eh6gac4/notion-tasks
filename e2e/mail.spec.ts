import { test, expect } from '@playwright/test';

test.describe('Notion Mail E2E Flow Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mail');
    await page.waitForLoadState('networkidle');
  });

  test('T4-01: Complete Email Composition with Slash Command & Toast', async ({ page }) => {
    // 1. Press 'c' shortcut to open compose modal
    await page.keyboard.press('c');
    await expect(page.getByTestId('compose-modal')).toBeVisible();

    // 2. Fill in To and Subject
    await page.getByTestId('compose-to-input').fill('e2e-test@notion.so');
    await page.getByTestId('compose-subject-input').fill('E2E Test Email Subject');

    // 3. Type slash command in body textarea
    const bodyArea = page.getByTestId('compose-body-textarea');
    await bodyArea.focus();
    await bodyArea.fill('/');

    // 4. Verify slash command menu pops up and select '/task' option
    await expect(page.getByTestId('slash-command-menu')).toBeVisible();
    await page.getByTestId('slash-option-task').click();

    // 5. Verify insertion of '[ ] ' and continue typing body content
    await expect(bodyArea).toHaveValue('[ ] ');
    await bodyArea.fill('[ ] Complete Q3 Roadmap Review E2E Test');

    // 6. Submit compose form
    await page.getByTestId('compose-send-button').click();

    // 7. Compose modal closes and toast notification appears
    await expect(page.getByTestId('compose-modal')).toBeHidden();
    await expect(page.getByTestId('mail-toast')).toBeVisible();
    await expect(page.getByTestId('mail-toast')).toContainText('Email sent successfully!');
  });

  test('T4-02: Notion Task Conversion Workflow', async ({ page }) => {
    // 1. Open the target email so the detail pane (with action buttons) renders
    await page
      .getByRole('option', { name: /Q3 Product Roadmap Review & Notion Tasks Integration/ })
      .click();

    // 2. Click Notion Taskify button in email detail view
    await page.getByRole('button', { name: /Taskify to Notion/i }).click();

    // 3. Verify Taskify modal opens with pre-filled title
    await expect(page.getByTestId('taskify-modal')).toBeVisible();
    await expect(page.getByTestId('taskify-title-input')).toHaveValue(
      'Q3 Product Roadmap Review & Notion Tasks Integration'
    );

    // 4. Update status and submit task
    await page.getByTestId('taskify-status-select').selectOption('In Progress');
    await page.getByTestId('taskify-submit-button').click();

    // 5. Modal closes and toast feedback is displayed
    await expect(page.getByTestId('taskify-modal')).toBeHidden();
    await expect(page.getByTestId('mail-toast')).toBeVisible();
    await expect(page.getByTestId('mail-toast')).toContainText('Task created in Notion');
  });

  test('T4-03: AI-Assisted Email Draft Generation Flow', async ({ page }) => {
    // 0. Open an email so the detail pane (with action buttons) renders
    await page
      .getByRole('option', { name: /Q3 Product Roadmap Review & Notion Tasks Integration/ })
      .click();

    // 1. Click AI Draft Reply button in detail pane
    await page.getByRole('button', { name: /AI Draft Reply/i }).click();
    await expect(page.getByTestId('ai-draft-modal')).toBeVisible();

    // 2. Click quick preset prompt button
    await page.getByTestId('preset-prompt-0').click();

    // 3. Click Generate button and wait for AI generation
    await page.getByTestId('ai-draft-generate-button').click();
    await page.waitForTimeout(700);

    // 4. Verify draft preview is generated and click Insert Draft
    await expect(page.getByTestId('ai-draft-result-textarea')).toBeVisible();
    await page.getByTestId('ai-draft-insert-button').click();

    // 5. AIDraftModal closes and MailComposeModal opens with populated draft
    await expect(page.getByTestId('ai-draft-modal')).toBeHidden();
    await expect(page.getByTestId('compose-modal')).toBeVisible();
    await expect(page.getByTestId('compose-body-textarea')).toContainText(
      'Thank you for your email regarding'
    );

    // 6. Send draft email
    await page.getByTestId('compose-send-button').click();
    await expect(page.getByTestId('mail-toast')).toContainText('Email sent successfully!');
  });

  test('T4-04: Full Inbox Keyboard Navigation & Shortcut Suppression', async ({ page }) => {
    // 一覧(inbox)は mail-1 → mail-2 の順。詳細ヘッダの見出しで選択中のメールを判定する。
    const detailHeading = (subject: string) => page.getByRole('heading', { name: subject });

    // 1. 'j' twice: 未選択 → mail-1 → mail-2
    await page.keyboard.press('j');
    await expect(detailHeading('Q3 Product Roadmap Review & Notion Tasks Integration')).toBeVisible();
    await page.keyboard.press('j');
    await expect(detailHeading('Weekly Cyberpunk UI Sync & Retro Theme Mockups')).toBeVisible();

    // 2. 'k' で mail-2 → mail-1 に戻る
    await page.keyboard.press('k');
    await expect(detailHeading('Q3 Product Roadmap Review & Notion Tasks Integration')).toBeVisible();

    // 3. モバイルでは詳細表示中に一覧(検索欄)が隠れるため、先に一覧へ戻す
    const backToList = page.getByRole('button', { name: /Back to List/i });
    if (await backToList.isVisible()) await backToList.click();

    // 4. 検索欄にフォーカスした状態では j / c ショートカットが抑止される
    await page.getByPlaceholder('Search mail...').focus();
    await page.keyboard.press('j');
    await page.keyboard.press('c');
    await expect(page.getByTestId('compose-modal')).toBeHidden();
  });
});
