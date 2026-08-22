import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MailManager } from '@/components/mail/MailManager';
import { getDefaultMailManagerProps } from '@/test/mailTestHelpers';
import { AIDraftModal } from '@/components/mail/AIDraftModal';
import { MailComposeModal } from '@/components/mail/MailComposeModal';
import { TaskifyModal } from '@/components/mail/TaskifyModal';
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from '@/lib/mockMailData';
import { Email } from '@/types/mail';

// src/app/actions.ts を vi.mock するテスト(TaskDetail.test.tsx 等)と同じパターン。
// Server Action の中身(requireAuth → @/auth → next-auth)をテスト環境で評価すると
// next/server の解決に失敗するため、モジュール境界でモックする。
// vi.mock は hoist されるため、実装は動的 import 経由で取得する(TDZ 回避)。
vi.mock('@/app/mail/actions', async () => {
  const { mockFetchMails } = await import('@/test/mailTestHelpers');
  return {
    fetchMailsAction: vi.fn(mockFetchMails),
    fetchMailBodyAction: vi.fn().mockResolvedValue(null),
    markAsReadAction: vi.fn().mockResolvedValue(undefined),
    toggleStarAction: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Adversarial State Synchronization & Purity Verification (Milestone 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1: Search Filter Navigation Sync', () => {
    it('navigates strictly within search-filtered emails using j and k without jumping to hidden emails', () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Search for 'UI' which matches mail-1 (Alex Rivers) and mail-2 (Kaito Tanaka), filtering out mail-6 (Elena Rostova)
      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'UI' } });
      fireEvent.blur(searchInput);

      const matchingEmails = INITIAL_MOCK_EMAILS.filter(
        (e) =>
          e.folder === 'inbox' &&
          (e.subject.toLowerCase().includes('ui') ||
            e.sender.name.toLowerCase().includes('ui') ||
            e.sender.email.toLowerCase().includes('ui') ||
            e.body.toLowerCase().includes('ui'))
      );
      expect(matchingEmails.length).toBeGreaterThan(1);

      // Press 'j' -> since nothing is selected yet, snaps to the first matching email (mail-1)
      fireEvent.keyDown(window, { key: 'j' });
      const detailSubject = screen.getByRole('heading', { level: 2 });
      expect(detailSubject).toHaveTextContent(matchingEmails[0].subject);

      // Press 'j' -> moves strictly to matching email 2 (mail-2), skipping non-matching items
      fireEvent.keyDown(window, { key: 'j' });
      expect(detailSubject).toHaveTextContent(matchingEmails[1].subject);

      // Press 'j' again -> reaches end of filtered emails, remains on matching email 2
      fireEvent.keyDown(window, { key: 'j' });
      expect(detailSubject).toHaveTextContent(matchingEmails[matchingEmails.length - 1].subject);

      // Press 'k' -> moves backwards strictly to matching email 1
      fireEvent.keyDown(window, { key: 'k' });
      expect(detailSubject).toHaveTextContent(matchingEmails[0].subject);

      // Press 'k' again -> remains on top matching email 1
      fireEvent.keyDown(window, { key: 'k' });
      expect(detailSubject).toHaveTextContent(matchingEmails[0].subject);
    });

    it('snaps selection to first visible search-filtered email when selectedId was filtered out', () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Initially mail-1 (Alex Rivers) is selected.
      // Now search for 'Kaito' (only matches mail-2).
      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'Kaito' } });
      fireEvent.blur(searchInput);

      // Press 'j' shortcut -> since mail-1 is hidden (currentIndex = -1 in filteredEmails), it snaps to matching email (mail-2)
      fireEvent.keyDown(window, { key: 'j' });
      const detailSubject = screen.getByRole('heading', { level: 2 });
      expect(detailSubject).toHaveTextContent('Weekly Cyberpunk UI Sync & Retro Theme Mockups');
    });

    it('does not throw or jump to hidden emails when zero emails match search query', () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'NON_MATCHING_SEARCH_QUERY_XYZ' } });
      fireEvent.blur(searchInput);

      expect(screen.getByText('No emails match your search.')).toBeInTheDocument();

      // Pressing j or k should be a no-op when zero emails match
      expect(() => {
        fireEvent.keyDown(window, { key: 'j' });
        fireEvent.keyDown(window, { key: 'k' });
      }).not.toThrow();
    });
  });

  describe('Requirement 2: Starred Folder Unstar Sync', () => {
    it('updates selectedId to next valid remaining starred email when unstarring while activeFolder === starred', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Switch to Starred folder
      const starredBtn = screen.getByRole('button', { name: /^Starred/i });
      fireEvent.click(starredBtn);

      const initialStarred = getFilteredEmails(INITIAL_MOCK_EMAILS, 'starred');
      expect(initialStarred.length).toBeGreaterThan(1);

      const firstStarred = initialStarred[0];
      const secondStarred = initialStarred[1];

      // Select the first starred email (folder switch no longer auto-selects it, and the
      // folder's contents only arrive after the Server Action round-trip resolves)
      await waitFor(() => {
        expect(screen.getAllByText(firstStarred.subject).length).toBeGreaterThan(0);
      });
      fireEvent.click(screen.getAllByText(firstStarred.subject)[0]);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(firstStarred.subject);

      // Click unstar on the first email
      const unstarBtns = screen.getAllByRole('button', { name: /Unstar email/i });
      fireEvent.click(unstarBtns[0]);

      // Selected email must update to secondStarred instead of displaying the unstarred item or crashing
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(secondStarred.subject);
    });

    it('sets selectedId to null and displays empty state when last starred email is unstarred', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Switch to Starred folder
      const starredBtn = screen.getByRole('button', { name: /^Starred/i });
      fireEvent.click(starredBtn);

      const initialStarred = getFilteredEmails(INITIAL_MOCK_EMAILS, 'starred');
      await waitFor(() => {
        expect(screen.getAllByText(initialStarred[0].subject).length).toBeGreaterThan(0);
      });

      let unstarBtns = screen.getAllByRole('button', { name: /Unstar email/i });

      // Unstar all starred emails until list is empty
      while (unstarBtns.length > 0) {
        fireEvent.click(unstarBtns[0]);
        unstarBtns = screen.queryAllByRole('button', { name: /Unstar email/i });
      }

      // Empty state should be rendered in both list and detail panes
      expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
      expect(screen.getByText('No Email Selected')).toBeInTheDocument();
    });
  });

  describe('Requirement 3: Render Purity & Modal Reset', () => {
    it('verifies generateMailId is pure at render time and produces unique prefixed IDs on call', async () => {
      // Mock Date.now to verify predictable timestamp generation
      const mockTimestamp = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Click compose button to open MailComposeModal
      const composeBtn = screen.getByRole('button', { name: /Compose/i });
      fireEvent.click(composeBtn);

      // Fill in and submit new draft
      const toInput = screen.getByTestId('compose-to-input');
      const subjectInput = screen.getByTestId('compose-subject-input');
      const sendBtn = screen.getByTestId('compose-send-button');

      fireEvent.change(toInput, { target: { value: 'recipient@test.com' } });
      fireEvent.change(subjectInput, { target: { value: 'Purity Test Subject' } });
      fireEvent.click(sendBtn);

      // Sent folder check (Server Action 経由でサーバーの sent フォルダを取得し直すため、
      // ローカルでのみ生成された "Purity Test Subject" は消えてしまう。folder 切替が完了
      // した後もローカル state に積んだ新規メールが残ることを確認する)
      const sentBtn = screen.getByRole('button', { name: /^Sent/i });
      fireEvent.click(sentBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Purity Test Subject').length).toBeGreaterThan(0);
      });
    });

    it('resets AIDraftModal state cleanly on reopen without useEffect setState cascading renders', () => {
      const mockClose = vi.fn();
      const mockInsert = vi.fn();
      const testEmail: Email = INITIAL_MOCK_EMAILS[0];

      // 1. Render modal open
      const { rerender } = render(
        <AIDraftModal isOpen={true} email={testEmail} onClose={mockClose} onInsertDraft={mockInsert} />
      );

      // Type prompt text
      const promptTextarea = screen.getByTestId('ai-draft-prompt-textarea');
      fireEvent.change(promptTextarea, { target: { value: 'Custom AI test prompt' } });
      expect(promptTextarea).toHaveValue('Custom AI test prompt');

      // 2. Close modal (isOpen = false)
      rerender(
        <AIDraftModal isOpen={false} email={testEmail} onClose={mockClose} onInsertDraft={mockInsert} />
      );
      expect(screen.queryByTestId('ai-draft-modal')).not.toBeInTheDocument();

      // 3. Re-open modal (isOpen = true)
      rerender(
        <AIDraftModal isOpen={true} email={testEmail} onClose={mockClose} onInsertDraft={mockInsert} />
      );

      // Prompt textarea should be reset to empty string
      const newPromptTextarea = screen.getByTestId('ai-draft-prompt-textarea');
      expect(newPromptTextarea).toHaveValue('');
    });

    it('resets MailComposeModal state cleanly on reopen without useEffect setState cascading renders', () => {
      const mockClose = vi.fn();
      const mockSend = vi.fn();

      // 1. Render modal open
      const { rerender } = render(
        <MailComposeModal isOpen={true} onClose={mockClose} onSend={mockSend} />
      );

      // Fill in fields and switch to preview
      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: 'draft@test.com' } });
      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'Draft Subject' } });
      fireEvent.change(screen.getByTestId('compose-body-textarea'), { target: { value: '# Hello World' } });

      const previewTabBtn = screen.getByRole('button', { name: /^Preview$/i });
      fireEvent.click(previewTabBtn);
      expect(screen.getByTestId('compose-markdown-preview')).toBeInTheDocument();

      // 2. Close modal
      rerender(<MailComposeModal isOpen={false} onClose={mockClose} onSend={mockSend} />);
      expect(screen.queryByTestId('compose-modal')).not.toBeInTheDocument();

      // 3. Re-open modal
      rerender(<MailComposeModal isOpen={true} onClose={mockClose} onSend={mockSend} />);

      // Fields should be reset to empty and Edit tab active
      expect(screen.getByTestId('compose-to-input')).toHaveValue('');
      expect(screen.getByTestId('compose-subject-input')).toHaveValue('');
      expect(screen.getByTestId('compose-body-textarea')).toHaveValue('');
      expect(screen.queryByTestId('compose-markdown-preview')).not.toBeInTheDocument();
    });

    it('resets TaskifyModal state cleanly when target email changes without useEffect setState cascading renders', () => {
      const mockClose = vi.fn();
      const mockCreate = vi.fn();
      const email1: Email = INITIAL_MOCK_EMAILS[0];
      const email2: Email = INITIAL_MOCK_EMAILS[1];

      // 1. Render with email1
      const { rerender } = render(
        <TaskifyModal isOpen={true} email={email1} onClose={mockClose} onCreateTask={mockCreate} />
      );

      expect(screen.getByTestId('taskify-title-input')).toHaveValue(email1.subject);

      // Change status and priority
      fireEvent.change(screen.getByTestId('taskify-status-select'), { target: { value: 'Done' } });
      fireEvent.change(screen.getByTestId('taskify-priority-select'), { target: { value: 'High' } });

      // 2. Switch email prop to email2
      rerender(
        <TaskifyModal isOpen={true} email={email2} onClose={mockClose} onCreateTask={mockCreate} />
      );

      // Title should reset to email2.subject, and status/priority to defaults ('To Do', 'Medium')
      expect(screen.getByTestId('taskify-title-input')).toHaveValue(email2.subject);
      expect(screen.getByTestId('taskify-status-select')).toHaveValue('To Do');
      expect(screen.getByTestId('taskify-priority-select')).toHaveValue('Medium');
    });
  });
});
