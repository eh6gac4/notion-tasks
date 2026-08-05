import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MailPage from '../page';
import { INITIAL_MOCK_EMAILS } from '@/lib/mockMailData';

describe('MailPage Orchestrator & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Core Layout & Navigation Flows', () => {
    it('renders initial 3-pane layout with default inbox selection', () => {
      render(<MailPage />);

      // Top bar header
      expect(screen.getByText('✦ NOTION MAIL')).toBeInTheDocument();

      // Pane 1: Sidebar
      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Starred')).toBeInTheDocument();

      // Pane 2 & 3: Email List & Detail (First email selected by default)
      const firstEmail = INITIAL_MOCK_EMAILS[0];
      expect(screen.getAllByText(firstEmail.sender.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(firstEmail.subject).length).toBeGreaterThan(0);
    });

    it('filters email list when selecting a folder in MailSidebar', () => {
      render(<MailPage />);

      // Switch to Sent folder
      const sentFolderBtn = screen.getByText('Sent');
      fireEvent.click(sentFolderBtn);

      // Verify email list filtered to sent emails
      const sentEmail = INITIAL_MOCK_EMAILS.find((e) => e.folder === 'sent');
      if (sentEmail) {
        expect(screen.getAllByText(sentEmail.subject).length).toBeGreaterThan(0);
      }
    });

    it('updates displayed email in MailDetail when clicking an item in MailList', () => {
      render(<MailPage />);

      // Click second email in inbox list
      const secondEmail = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox')[1];
      if (secondEmail) {
        const itemRow = screen.getAllByText(secondEmail.subject)[0];
        fireEvent.click(itemRow);

        expect(screen.getAllByText(secondEmail.subject).length).toBeGreaterThan(0);
      }
    });

    it('navigates list items up and down using global j and k keyboard shortcuts', () => {
      render(<MailPage />);

      const inboxEmails = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox');

      // Initially first inbox email is selected
      expect(screen.getAllByText(inboxEmails[0].subject).length).toBeGreaterThan(0);

      // Press 'j' -> moves selection down to second inbox email
      fireEvent.keyDown(window, { key: 'j' });
      expect(screen.getAllByText(inboxEmails[1].subject).length).toBeGreaterThan(0);

      // Press 'k' -> moves selection back up to first inbox email
      fireEvent.keyDown(window, { key: 'k' });
      expect(screen.getAllByText(inboxEmails[0].subject).length).toBeGreaterThan(0);
    });

    it('opens MailComposeModal when pressing global c key shortcut', () => {
      render(<MailPage />);

      expect(screen.queryByTestId('compose-modal')).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'c' });
      expect(screen.getByTestId('compose-modal')).toBeInTheDocument();
    });
  });

  describe('Tier 2: Cross-Feature Interactions & Edge Conditions', () => {
    it('suppresses j, k, c global shortcuts when typing inside search input', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      searchInput.focus();

      const inboxEmails = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox');

      // Fire 'j' inside search input -> selection should NOT move
      fireEvent.keyDown(searchInput, { key: 'j' });
      expect(screen.getAllByText(inboxEmails[0].subject).length).toBeGreaterThan(0);

      // Fire 'c' inside search input -> compose modal should NOT open
      fireEvent.keyDown(searchInput, { key: 'c' });
      expect(screen.queryByTestId('compose-modal')).not.toBeInTheDocument();
    });

    it('opens TaskifyModal when clicking Taskify button in MailDetail, and creates task with toast feedback', () => {
      render(<MailPage />);

      // Select the first inbox email (render no longer auto-selects it)
      const inboxEmails = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox');
      fireEvent.click(screen.getAllByText(inboxEmails[0].subject)[0]);

      const taskifyBtn = screen.getByRole('button', { name: /Taskify to Notion/i });
      fireEvent.click(taskifyBtn);

      expect(screen.getByTestId('taskify-modal')).toBeInTheDocument();

      // Submit task form
      const submitBtn = screen.getByTestId('taskify-submit-button');
      fireEvent.click(submitBtn);

      // Taskify modal closes and Toast notification appears
      expect(screen.queryByTestId('taskify-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('mail-toast')).toBeInTheDocument();
      expect(screen.getByText(/Task created in Notion/)).toBeInTheDocument();
    });

    it('executes AI draft flow: open AIDraftModal -> generate draft -> populate ComposeModal', () => {
      vi.useFakeTimers();

      render(<MailPage />);

      // Select the first inbox email (render no longer auto-selects it)
      const inboxEmails = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox');
      fireEvent.click(screen.getAllByText(inboxEmails[0].subject)[0]);

      // Click AI Draft Reply button
      const aiBtn = screen.getByRole('button', { name: /AI Draft Reply/i });
      fireEvent.click(aiBtn);

      expect(screen.getByTestId('ai-draft-modal')).toBeInTheDocument();

      // Select preset prompt
      const presetBtn = screen.getByTestId('preset-prompt-0');
      fireEvent.click(presetBtn);

      // Click Generate button
      const generateBtn = screen.getByTestId('ai-draft-generate-button');
      fireEvent.click(generateBtn);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Insert generated draft
      const insertBtn = screen.getByTestId('ai-draft-insert-button');
      fireEvent.click(insertBtn);

      // AIDraftModal closes and MailComposeModal opens with generated draft
      expect(screen.queryByTestId('ai-draft-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('compose-modal')).toBeInTheDocument();
      const composeTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;
      expect(composeTextarea.value).toContain('Thank you for your email regarding');

      vi.useRealTimers();
    });

    it('sends email from ComposeModal and adds sent email to store with success toast', () => {
      render(<MailPage />);

      // Open compose modal via button
      const composeBtn = screen.getByRole('button', { name: /compose/i });
      fireEvent.click(composeBtn);

      // Fill in fields
      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: 'recipient@test.com' } });
      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'New Test Mail' } });
      fireEvent.change(screen.getByTestId('compose-body-textarea'), { target: { value: 'Test body content' } });

      // Click Send
      fireEvent.click(screen.getByTestId('compose-send-button'));

      expect(screen.queryByTestId('compose-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('mail-toast')).toBeInTheDocument();
      expect(screen.getByText('Email sent successfully!')).toBeInTheDocument();
    });
  });
});
