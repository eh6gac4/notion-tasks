import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailList } from '../MailList';
import { Email } from '@/types/mail';

const mockEmails: Email[] = [
  {
    id: 'mail-1',
    sender: { name: 'Alex Rivers', email: 'alex@example.com', avatar: 'AR' },
    recipients: ['user@example.com'],
    subject: 'Q3 Product Roadmap Review',
    body: '# Roadmap\nHere is the plan for Q3.',
    date: '2026-07-31T09:30:00Z',
    folder: 'inbox',
    isRead: false,
    isStarred: true,
  },
  {
    id: 'mail-2',
    sender: { name: 'Kaito Tanaka', email: 'kaito@example.com', avatar: 'KT' },
    recipients: ['user@example.com'],
    subject: 'Weekly Cyberpunk UI Sync',
    body: 'Updated design tokens in CSS.',
    date: '2026-07-30T08:15:00Z',
    folder: 'inbox',
    isRead: true,
    isStarred: false,
  },
];

describe('MailList Component', () => {
  const defaultProps = {
    emails: mockEmails,
    selectedId: 'mail-1',
    onSelectEmail: vi.fn(),
    onToggleStar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('renders email list displaying sender name, subject, and preview body', () => {
      render(<MailList {...defaultProps} />);

      expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
      expect(screen.getByText('Q3 Product Roadmap Review')).toBeInTheDocument();
      expect(screen.getByText('Kaito Tanaka')).toBeInTheDocument();
      expect(screen.getByText('Weekly Cyberpunk UI Sync')).toBeInTheDocument();
    });

    it('highlights the selected email item row matching selectedId', () => {
      render(<MailList {...defaultProps} selectedId="mail-2" />);

      const selectedItem = screen.getByText('Kaito Tanaka').closest('div[role="option"]');
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
      expect(selectedItem).toHaveClass('border-[var(--accent)]');
    });

    it('triggers onSelectEmail callback when clicking an email item row', () => {
      const onSelectEmail = vi.fn();
      render(<MailList {...defaultProps} onSelectEmail={onSelectEmail} />);

      fireEvent.click(screen.getByText('Weekly Cyberpunk UI Sync'));
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');
    });

    it('triggers onToggleStar callback when clicking star button on email item', () => {
      const onToggleStar = vi.fn();
      render(<MailList {...defaultProps} onToggleStar={onToggleStar} />);

      const starButtons = screen.getAllByLabelText(/star email|unstar email/i);
      fireEvent.click(starButtons[0]);

      expect(onToggleStar).toHaveBeenCalledWith('mail-1', expect.anything());
    });

    it('filters email list dynamically when searchQuery is provided', () => {
      render(<MailList {...defaultProps} searchQuery="Cyberpunk" />);

      expect(screen.getByText('Kaito Tanaka')).toBeInTheDocument();
      expect(screen.queryByText('Alex Rivers')).not.toBeInTheDocument();
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('renders empty state placeholder when emails list is empty', () => {
      render(<MailList {...defaultProps} emails={[]} />);

      expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
    });

    it('renders no search match message when searchQuery filters out all items', () => {
      render(<MailList {...defaultProps} searchQuery="NonExistentTerm999" />);

      expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
    });

    it('calls onSearchChange when user types in search input field', () => {
      const onSearchChange = vi.fn();
      render(<MailList {...defaultProps} onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'Roadmap' } });

      expect(onSearchChange).toHaveBeenCalledWith('Roadmap');
    });

    it('clears search query when clicking clear search (✕) button', () => {
      const onSearchChange = vi.fn();
      render(<MailList {...defaultProps} searchQuery="test" onSearchChange={onSearchChange} />);

      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn);

      expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('selects email when pressing Enter or Space key on email row button', () => {
      const onSelectEmail = vi.fn();
      render(<MailList {...defaultProps} onSelectEmail={onSelectEmail} />);

      const secondRow = screen.getByText('Kaito Tanaka').closest('div[role="option"]')!;

      fireEvent.keyDown(secondRow, { key: 'Enter' });
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');

      fireEvent.keyDown(secondRow, { key: ' ' });
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');
    });

    it('displays unread dot indicator for unread emails only', () => {
      render(<MailList {...defaultProps} />);

      const unreadDots = screen.getAllByLabelText('Unread message');
      expect(unreadDots.length).toBe(1);
    });
  });
});
