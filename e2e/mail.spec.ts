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
    // 1. Ensure page 3-pane layout is loaded
    await expect(page.getByText('Q3 Product Roadmap Review & Notion Tasks Integration')).toBeVisible();

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
    // 1. Press 'j' key to navigate down email list
    await page.keyboard.press('j');
    await expect(page.getByText('Weekly Cyberpunk UI Sync & Retro Theme Mockups')).toBeVisible();

    // 2. Press 'k' key to navigate back up email list
    await page.keyboard.press('k');
    await expect(page.getByText('Q3 Product Roadmap Review & Notion Tasks Integration')).toBeVisible();

    // 3. Focus search input and type 'j' and 'c' (shortcuts should be suppressed)
    const searchInput = page.getByPlaceholder('Search mail...');
    await searchInput.focus();
    await page.keyboard.press('j');
    await page.keyboard.press('c');

    // 4. Verify compose modal did NOT open while search input is focused
    await expect(page.getByTestId('compose-modal')).toBeHidden();
  });
});
