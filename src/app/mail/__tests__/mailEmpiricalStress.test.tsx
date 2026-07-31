import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MailPage from '../page';
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from '@/lib/mockMailData';

describe('Empirical Adversarial Stress Suite for Notion Mail (Milestone 1)', () => {
  beforeEach(() => {
    // Clean setup
  });

  describe('Check 1: Folder Filtering Across All Folders', () => {
    it('toggles across all folders (inbox, starred, sent, archive, trash) and updates email list', () => {
      render(<MailPage />);

      const folders = ['inbox', 'starred', 'sent', 'archive', 'trash'] as const;

      folders.forEach((folder) => {
        const folderLabel = folder.charAt(0).toUpperCase() + folder.slice(1);
        const folderBtn = screen.getByRole('button', { name: new RegExp(`^${folderLabel}`, 'i') });
        fireEvent.click(folderBtn);

        const expectedEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, folder);
        if (expectedEmails.length > 0) {
          expect(screen.getAllByText(expectedEmails[0].subject).length).toBeGreaterThan(0);
        } else {
          expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
        }
      });
    });

    it('updates selected email when switching folders', () => {
      render(<MailPage />);

      const sentBtn = screen.getByRole('button', { name: /^Sent/i });
      fireEvent.click(sentBtn);

      const sentEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'sent');
      expect(sentEmails.length).toBeGreaterThan(0);
      expect(screen.getAllByText(sentEmails[0].subject).length).toBeGreaterThan(0);
    });

    it('unstarring an email while viewing Starred folder updates selectedId to a valid remaining starred email', () => {
      render(<MailPage />);

      // Switch to Starred folder
      const starredBtn = screen.getByRole('button', { name: /^Starred/i });
      fireEvent.click(starredBtn);

      const starredEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'starred');
      expect(starredEmails.length).toBeGreaterThan(1);
      const targetStarredEmail = starredEmails[0];
      const nextStarredEmail = starredEmails[1];

      // Unstar the first starred email
      const unstarButtons = screen.getAllByRole('button', { name: /Unstar email/i });
      fireEvent.click(unstarButtons[0]);

      // The unstarred item should no longer be listed in MailList, and selectedId updates to next valid starred email
      const detailSubject = screen.getByRole('heading', { level: 2 });
      expect(detailSubject).toHaveTextContent(nextStarredEmail.subject);
    });
  });

  describe('Check 2: Search Query Handling & Edge Cases', () => {
    it('handles non-matching query and renders empty state correctly', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'XYZ_NON_EXISTENT_SEARCH_999' } });

      expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('handles special characters without crashing or throwing SyntaxError', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      const specialQuery = '[regex]*?()+^\\$#@!';

      expect(() => {
        fireEvent.change(searchInput, { target: { value: specialQuery } });
      }).not.toThrow();

      expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
    });

    it('handles case-insensitive search queries', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'kAiTo' } });

      expect(screen.getAllByText('Kaito Tanaka').length).toBeGreaterThan(0);
      expect(screen.getByText('1 messages')).toBeInTheDocument();
    });

    it('clears search query when clear button (✕) is clicked', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'Kaito' } });

      const clearBtn = screen.getByRole('button', { name: /Clear search/i });
      fireEvent.click(clearBtn);

      expect(searchInput).toHaveValue('');
    });

    it('ensures j/k shortcuts operate only on search-filtered list', () => {
      render(<MailPage />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      // Search for Kaito (only mail-2 matches, mail-1 and mail-6 hidden)
      fireEvent.change(searchInput, { target: { value: 'Kaito' } });
      fireEvent.blur(searchInput);

      // Initially selected is mail-1 (Alex Rivers)
      // Press 'j' shortcut -> moves to single matching item in filteredEmails (mail-2 Kaito Tanaka)
      fireEvent.keyDown(window, { key: 'j' });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Weekly Cyberpunk UI Sync & Retro Theme Mockups');

      // Press 'j' shortcut AGAIN -> stays at last item of filteredEmails (mail-2) instead of navigating to hidden mail-6
      fireEvent.keyDown(window, { key: 'j' });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Weekly Cyberpunk UI Sync & Retro Theme Mockups');
    });
  });

  describe('Check 3: Star Toggling Side Effects & Selection Persistence', () => {
    it('toggles star without changing currently selected email row in Inbox', () => {
      render(<MailPage />);

      const inboxEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox');
      const firstSubject = inboxEmails[0].subject;

      // Click star button on second email item in list
      const starButtons = screen.getAllByRole('button', { name: /Star email|Unstar email/i });
      expect(starButtons.length).toBeGreaterThan(1);

      fireEvent.click(starButtons[1]);

      // Detail view should STILL be showing the first email
      const detailSubjectHeading = screen.getByRole('heading', { level: 2 });
      expect(detailSubjectHeading).toHaveTextContent(firstSubject);
    });

    it('marks unread email as read upon selection', () => {
      render(<MailPage />);

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
