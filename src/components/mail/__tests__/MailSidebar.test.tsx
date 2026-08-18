import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailSidebar } from '../MailSidebar';
import { MailFolder } from '@/types/mail';

describe('MailSidebar Component', () => {
  const defaultUnreadCounts: Record<MailFolder, number> = {
    all: 4,
    inbox: 3,
    starred: 1,
    sent: 0,
    archive: 0,
    trash: 0,
  };

  const defaultProps = {
    activeFolder: 'inbox' as MailFolder,
    unreadCounts: defaultUnreadCounts,
    onSelectFolder: vi.fn(),
    onOpenCompose: vi.fn(),
    labels: ['Design', 'Product'],
    activeLabel: null,
    onSelectLabel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('renders all 6 folder navigation items (All Mail, Inbox, Starred, Sent, Archive, Trash)', () => {
      render(<MailSidebar {...defaultProps} />);

      expect(screen.getByText('All Mail')).toBeInTheDocument();
      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Starred')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
    });

    it('applies active styling to the folder corresponding to activeFolder prop', () => {
      render(<MailSidebar {...defaultProps} activeFolder="starred" />);

      const starredButton = screen.getByText('Starred').closest('button');
      expect(starredButton).toHaveClass('font-semibold');
      expect(starredButton).toHaveClass('border-[var(--accent)]');
    });

    it('displays unread badge count for folders with unread messages', () => {
      render(<MailSidebar {...defaultProps} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calls onSelectFolder with correct folder id when folder button is clicked', () => {
      const onSelectFolder = vi.fn();
      render(<MailSidebar {...defaultProps} onSelectFolder={onSelectFolder} />);

      fireEvent.click(screen.getByText('Sent'));
      expect(onSelectFolder).toHaveBeenCalledWith('sent');

      fireEvent.click(screen.getByText('Trash'));
      expect(onSelectFolder).toHaveBeenCalledWith('trash');
    });

    it('renders Compose button and fires onOpenCompose callback when clicked', () => {
      const onOpenCompose = vi.fn();
      render(<MailSidebar {...defaultProps} onOpenCompose={onOpenCompose} />);

      const composeButton = screen.getByRole('button', { name: /compose/i });
      expect(composeButton).toBeInTheDocument();

      fireEvent.click(composeButton);
      expect(onOpenCompose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('hides unread count badge when folder unread count is 0', () => {
      const zeroUnreadCounts: Record<MailFolder, number> = {
        all: 0,
        inbox: 0,
        starred: 0,
        sent: 0,
        archive: 0,
        trash: 0,
      };
      render(<MailSidebar {...defaultProps} unreadCounts={zeroUnreadCounts} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('displays large unread count numbers without layout truncation', () => {
      const largeUnreadCounts: Record<MailFolder, number> = {
        all: 0,
        inbox: 9999,
        starred: 0,
        sent: 0,
        archive: 0,
        trash: 0,
      };
      render(<MailSidebar {...defaultProps} unreadCounts={largeUnreadCounts} />);

      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    it('handles unrecognized active folder gracefully without throwing runtime error', () => {
      render(<MailSidebar {...defaultProps} activeFolder={'unknown_folder' as MailFolder} />);

      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('triggers folder selection on rapid multiple clicks', () => {
      const onSelectFolder = vi.fn();
      render(<MailSidebar {...defaultProps} onSelectFolder={onSelectFolder} />);

      const archiveBtn = screen.getByText('Archive');
      fireEvent.click(archiveBtn);
      fireEvent.click(archiveBtn);

      expect(onSelectFolder).toHaveBeenCalledTimes(2);
      expect(onSelectFolder).toHaveBeenLastCalledWith('archive');
    });

    it('renders accessible folder navigation landmark and buttons', () => {
      render(<MailSidebar {...defaultProps} />);

      const nav = screen.getByRole('navigation', { name: /mail folders/i });
      expect(nav).toBeInTheDocument();
    });
  });
});
