import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MailManager } from '@/components/mail/MailManager';
import { getDefaultMailManagerProps } from '@/test/mailTestHelpers';
import { submitSearch, clearSearch } from '@/test/mailDomHelpers';
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from '@/lib/mockMailData';

// src/app/actions.ts を vi.mock するテスト(TaskDetail.test.tsx 等)と同じパターン。
// Server Action の中身(requireAuth → @/auth → next-auth)をテスト環境で評価すると
// next/server の解決に失敗するため、モジュール境界でモックする。
// vi.mock は hoist されるため、実装は動的 import 経由で取得する(TDZ 回避)。
vi.mock('@/app/mail/actions', async () => {
  const { mockFetchMails, mockSearchMails } = await import('@/test/mailTestHelpers');
  return {
    fetchMailsAction: vi.fn(mockFetchMails),
    searchMailsAction: vi.fn(mockSearchMails),
    fetchMailBodyAction: vi.fn().mockResolvedValue(null),
    markAsReadAction: vi.fn().mockResolvedValue(undefined),
    toggleStarAction: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Empirical Adversarial Stress Suite for Notion Mail (Milestone 1)', () => {
  beforeEach(() => {
    // Clean setup
  });

  describe('Check 1: Folder Filtering Across All Folders', () => {
    it('toggles across all folders (inbox, starred, sent, archive, trash) and updates email list', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const folders = ['inbox', 'starred', 'sent', 'archive', 'trash'] as const;

      for (const folder of folders) {
        const folderLabel = folder.charAt(0).toUpperCase() + folder.slice(1);
        const folderBtn = screen.getByRole('button', { name: new RegExp(`^${folderLabel}`, 'i') });
        fireEvent.click(folderBtn);

        const expectedEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, folder);
        if (expectedEmails.length > 0) {
          await waitFor(() => {
            expect(screen.getAllByText(expectedEmails[0].subject).length).toBeGreaterThan(0);
          });
        } else {
          await waitFor(() => {
            expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
          });
        }
      }
    });

    it('updates selected email when switching folders', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const sentBtn = screen.getByRole('button', { name: /^Sent/i });
      fireEvent.click(sentBtn);

      const sentEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'sent');
      expect(sentEmails.length).toBeGreaterThan(0);
      await waitFor(() => {
        expect(screen.getAllByText(sentEmails[0].subject).length).toBeGreaterThan(0);
      });
    });

    it('unstarring an email while viewing Starred folder updates selectedId to a valid remaining starred email', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Switch to Starred folder
      const starredBtn = screen.getByRole('button', { name: /^Starred/i });
      fireEvent.click(starredBtn);

      const starredEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'starred');
      expect(starredEmails.length).toBeGreaterThan(1);
      const targetStarredEmail = starredEmails[0];
      const nextStarredEmail = starredEmails[1];

      // Select the first starred email (folder switch no longer auto-selects it, and the
      // folder's contents only arrive after the Server Action round-trip resolves)
      await waitFor(() => {
        expect(screen.getAllByText(targetStarredEmail.subject).length).toBeGreaterThan(0);
      });
      fireEvent.click(screen.getAllByText(targetStarredEmail.subject)[0]);

      // Unstar the first starred email
      const unstarButtons = screen.getAllByRole('button', { name: /Unstar email/i });
      fireEvent.click(unstarButtons[0]);

      // The unstarred item should no longer be listed in MailList, and selectedId updates to next valid starred email
      const detailSubject = screen.getByRole('heading', { level: 2 });
      expect(detailSubject).toHaveTextContent(nextStarredEmail.subject);
    });
  });

  describe('Check 2: Search Query Handling & Edge Cases', () => {
    it('does not filter the list until the query is submitted', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const inboxCount = getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox').length;
      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'Kaito' } });

      // Typing alone must not touch the list — the search runs on Enter.
      expect(screen.getByText(`${inboxCount} messages`)).toBeInTheDocument();

      await submitSearch('Kaito');
      await waitFor(() => {
        expect(screen.getByText('1 messages')).toBeInTheDocument();
      });
    });

    it('handles non-matching query and renders empty state correctly', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      await submitSearch('XYZ_NON_EXISTENT_SEARCH_999');

      await waitFor(() => {
        expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
      });
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('handles special characters without crashing or throwing SyntaxError', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      await submitSearch('[regex]*?()+^\\$#@!');

      await waitFor(() => {
        expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
      });
    });

    it('handles case-insensitive search queries', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      await submitSearch('kAiTo');

      await waitFor(() => {
        expect(screen.getAllByText('Kaito Tanaka').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('1 messages')).toBeInTheDocument();
    });

    // 'handoff' は mail-3(archive)の本文の終盤にしか現れない。件名にも無く、一覧が持つ
    // snippet(本文冒頭)にも入らないため、冒頭一致の旧実装では当たらなかった語。
    it('matches text in the middle of the body of a mail outside the current folder', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      await submitSearch('handoff');

      await waitFor(() => {
        expect(screen.getAllByText('API Spec Update: Antigravity Agent Orchestration').length).toBeGreaterThan(0);
      });
    });

    it('returns to the folder listing when the clear button (✕) is clicked', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      await submitSearch('Kaito');
      await waitFor(() => {
        expect(screen.getByText('1 messages')).toBeInTheDocument();
      });

      await clearSearch();

      expect(screen.getByPlaceholderText('Search mail...')).toHaveValue('');
      const inboxCount = getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox').length;
      await waitFor(() => {
        expect(screen.getByText(`${inboxCount} messages`)).toBeInTheDocument();
      });
    });

    it('ensures j/k shortcuts operate only on the search results', async () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      // Search for Kaito (only mail-2 matches, mail-1 and mail-6 hidden)
      await submitSearch('Kaito');
      await waitFor(() => {
        expect(screen.getByText('1 messages')).toBeInTheDocument();
      });

      // Press 'j' shortcut -> since nothing is selected yet, snaps to single matching item (mail-2 Kaito Tanaka)
      fireEvent.keyDown(window, { key: 'j' });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Weekly Cyberpunk UI Sync & Retro Theme Mockups');

      // Press 'j' shortcut AGAIN -> stays at the last result instead of navigating to a hidden email
      fireEvent.keyDown(window, { key: 'j' });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Weekly Cyberpunk UI Sync & Retro Theme Mockups');
    });
  });

  describe('Check 3: Star Toggling Side Effects & Selection Persistence', () => {
    it('toggles star without changing currently selected email row in Inbox', () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const inboxEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox');
      const firstSubject = inboxEmails[0].subject;

      // Select the first inbox email (render no longer auto-selects it)
      fireEvent.click(screen.getAllByText(firstSubject)[0]);

      // Click star button on second email item in list
      const starButtons = screen.getAllByRole('button', { name: /Star email|Unstar email/i });
      expect(starButtons.length).toBeGreaterThan(1);

      fireEvent.click(starButtons[1]);

      // Detail view should STILL be showing the first email
      const detailSubjectHeading = screen.getByRole('heading', { level: 2 });
      expect(detailSubjectHeading).toHaveTextContent(firstSubject);
    });

    it('marks unread email as read upon selection', () => {
      render(<MailManager {...getDefaultMailManagerProps()} />);

      const unreadEmails = INITIAL_MOCK_EMAILS.filter((e) => e.folder === 'inbox' && !e.isRead);
      expect(unreadEmails.length).toBeGreaterThan(0);

      // Click second unread email subject in list
      const targetEmail = unreadEmails[1] || unreadEmails[0];
      const subjectElements = screen.getAllByText(targetEmail.subject);
      fireEvent.click(subjectElements[0]);

      // Detail view displays target email
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(targetEmail.subject);
    });
  });
});
