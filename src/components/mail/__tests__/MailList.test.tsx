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

    // 検索の絞り込みは MailManager が行い、MailList は渡された結果をそのまま描画する
    // (j/k ナビゲーションと表示を同じリストで揃えるため、フィルタは親に一本化している)。
    it('renders exactly the emails it is given while a search is active', () => {
      const matched = defaultProps.emails.filter((email) => email.sender.name === 'Kaito Tanaka');
      render(<MailList {...defaultProps} emails={matched} searchQuery="Cyberpunk" activeSearch="Cyberpunk" />);

      expect(screen.getByText('Kaito Tanaka')).toBeInTheDocument();
      expect(screen.queryByText('Alex Rivers')).not.toBeInTheDocument();
    });

    it('calls onSearchSubmit with the typed query when the search form is submitted', () => {
      const onSearchSubmit = vi.fn();
      render(<MailList {...defaultProps} searchQuery="Roadmap" onSearchSubmit={onSearchSubmit} />);

      fireEvent.submit(screen.getByRole('search'));

      expect(onSearchSubmit).toHaveBeenCalledWith('Roadmap');
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('renders empty state placeholder when emails list is empty', () => {
      render(<MailList {...defaultProps} emails={[]} />);

      expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
    });

    it('renders no search match message when a submitted search leaves no emails', () => {
      render(
        <MailList {...defaultProps} emails={[]} searchQuery="NonExistentTerm999" activeSearch="NonExistentTerm999" />
      );

      expect(screen.getByText('No emails match your search.')).toBeInTheDocument();
    });

    // 打鍵の途中で「該当なし」が出ないよう、空状態の文言は確定済みの検索語で決める。
    it('keeps the folder empty state while a query is typed but not yet submitted', () => {
      render(<MailList {...defaultProps} emails={[]} searchQuery="NonExistentTerm999" activeSearch="" />);

      expect(screen.getByText('No emails in this folder.')).toBeInTheDocument();
    });

    it('calls onSearchChange when user types in search input field', () => {
      const onSearchChange = vi.fn();
      render(<MailList {...defaultProps} onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText('Search mail...');
      fireEvent.change(searchInput, { target: { value: 'Roadmap' } });

      expect(onSearchChange).toHaveBeenCalledWith('Roadmap');
    });

    // 空での確定が検索解除の合図。入力欄の値も確定に合わせて親が空にするため、
    // ✕ が呼ぶのは onSearchSubmit だけでよい。
    it('submits an empty query when clicking clear search (✕) button', () => {
      const onSearchSubmit = vi.fn();
      render(<MailList {...defaultProps} searchQuery="test" activeSearch="test" onSearchSubmit={onSearchSubmit} />);

      fireEvent.click(screen.getByLabelText('Clear search'));

      expect(onSearchSubmit).toHaveBeenCalledWith('');
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

  describe('Swipe to archive', () => {
    const swipe = (row: Element, dx: number, dy = 0) => {
      fireEvent.touchStart(row, { touches: [{ clientX: 0, clientY: 0 }] });
      fireEvent.touchMove(row, { touches: [{ clientX: dx, clientY: dy }] });
      fireEvent.touchEnd(row);
    };

    const getRow = (senderName: string) =>
      screen.getByText(senderName).closest('div[role="option"]')!;

    it('archives the email when swiped beyond the threshold', () => {
      const onToggleArchive = vi.fn();
      render(<MailList {...defaultProps} onToggleArchive={onToggleArchive} />);

      swipe(getRow('Kaito Tanaka'), -100);

      expect(onToggleArchive).toHaveBeenCalledWith('mail-2');
    });

    it('archives on a rightward swipe as well', () => {
      const onToggleArchive = vi.fn();
      render(<MailList {...defaultProps} onToggleArchive={onToggleArchive} />);

      swipe(getRow('Kaito Tanaka'), 100);

      expect(onToggleArchive).toHaveBeenCalledWith('mail-2');
    });

    it('does not archive when the swipe is shorter than the threshold', () => {
      const onToggleArchive = vi.fn();
      const onSelectEmail = vi.fn();
      render(
        <MailList {...defaultProps} onSelectEmail={onSelectEmail} onToggleArchive={onToggleArchive} />
      );

      const row = getRow('Kaito Tanaka');
      swipe(row, -20);
      fireEvent.click(row);

      expect(onToggleArchive).not.toHaveBeenCalled();
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');
    });

    it('ignores mostly-vertical drags so the list can still scroll', () => {
      const onToggleArchive = vi.fn();
      render(<MailList {...defaultProps} onToggleArchive={onToggleArchive} />);

      swipe(getRow('Kaito Tanaka'), -100, -160);

      expect(onToggleArchive).not.toHaveBeenCalled();
    });

    it('does not open the email on the click that follows a completed swipe', () => {
      const onSelectEmail = vi.fn();
      const onToggleArchive = vi.fn();
      render(
        <MailList {...defaultProps} onSelectEmail={onSelectEmail} onToggleArchive={onToggleArchive} />
      );

      const row = getRow('Kaito Tanaka');
      swipe(row, -100);
      fireEvent.click(row);

      expect(onToggleArchive).toHaveBeenCalledWith('mail-2');
      expect(onSelectEmail).not.toHaveBeenCalled();
    });

    it('does not throw when onToggleArchive is not provided', () => {
      render(<MailList {...defaultProps} onToggleArchive={undefined} />);

      expect(() => swipe(getRow('Kaito Tanaka'), -100)).not.toThrow();
    });
  });
});
