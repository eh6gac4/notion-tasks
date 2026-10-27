import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailDetail } from '../MailDetail';
import { Email } from '@/types/mail';

const sampleEmail: Email = {
  id: 'mail-100',
  sender: {
    name: 'Alex Rivers',
    email: 'alex.rivers@example.com',
    avatar: 'AR',
  },
  recipients: ['user1@tasks.local', 'user2@tasks.local'],
  subject: 'Q3 Product Roadmap Review & Task Management',
  body: `# Roadmap Spec\n\nThis is the markdown body of the email.`,
  date: '2026-07-31T09:30:00Z',
  folder: 'inbox',
  isRead: true,
  isStarred: false,
};

describe('MailDetail Component', () => {
  const defaultProps = {
    email: sampleEmail,
    onAIDraft: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('renders empty state placeholder when email prop is null', () => {
      render(<MailDetail email={null} />);

      expect(screen.getByText('No Email Selected')).toBeInTheDocument();
      expect(screen.getByText(/Select an email from the list/i)).toBeInTheDocument();
    });

    it('swipes back after selecting the first email from an empty detail pane', () => {
      const onBack = vi.fn();
      const { rerender } = render(<MailDetail email={null} onBack={onBack} />);
      for (let i = 0; i < 2; i++) {
        rerender(<MailDetail email={sampleEmail} onBack={onBack} />);
        const el = screen.getByRole('button', { name: 'Back to List' });
        fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 100, identifier: 0 }] });
        fireEvent.touchMove(el, { touches: [{ clientX: 110, clientY: 105, identifier: 0 }] });
        fireEvent.touchEnd(el, { touches: [], changedTouches: [{ clientX: 110, clientY: 105, identifier: 0 }] });
        rerender(<MailDetail email={null} onBack={onBack} />);
      }
      expect(onBack).toHaveBeenCalledTimes(2);
    });

    it('renders full email details including subject, folder badge, sender, recipients, and body', () => {
      render(<MailDetail {...defaultProps} />);

      expect(screen.getByText(sampleEmail.subject)).toBeInTheDocument();
      expect(screen.getByText('inbox')).toBeInTheDocument();
      expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
      expect(screen.getByText('<alex.rivers@example.com>')).toBeInTheDocument();
      expect(screen.getByText('to user1@tasks.local, user2@tasks.local')).toBeInTheDocument();
      expect(screen.getByText(/Roadmap Spec/)).toBeInTheDocument();
    });

    it('triggers onAIDraft callback when AI Draft Reply button is clicked', () => {
      const onAIDraft = vi.fn();
      render(<MailDetail {...defaultProps} onAIDraft={onAIDraft} />);

      const aiDraftBtn = screen.getByRole('button', { name: /AI Draft Reply/i });
      fireEvent.click(aiDraftBtn);

      expect(onAIDraft).toHaveBeenCalledWith(sampleEmail);
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('uses fallback initials when sender avatar is missing', () => {
      const noAvatarEmail: Email = {
        ...sampleEmail,
        sender: { name: 'Sarah Chen', email: 'schen@example.com' },
      };
      render(<MailDetail {...defaultProps} email={noAvatarEmail} />);

      expect(screen.getByText('SC')).toBeInTheDocument();
    });

    it('renders email body whitespace and formatting properly', () => {
      const formattedEmail: Email = {
        ...sampleEmail,
        body: 'Line 1\nLine 2\nLine 3',
      };
      render(<MailDetail {...defaultProps} email={formattedEmail} />);

      expect(screen.getByText(/Line 1[\s\S]*Line 2[\s\S]*Line 3/)).toBeInTheDocument();
    });

    it('handles email with single recipient cleanly', () => {
      const singleRecipientEmail: Email = {
        ...sampleEmail,
        recipients: ['onlyone@example.com'],
      };
      render(<MailDetail {...defaultProps} email={singleRecipientEmail} />);

      expect(screen.getByText('to onlyone@example.com')).toBeInTheDocument();
    });

    it('prevents crashes when optional callback handlers (onAIDraft) are undefined', () => {
      render(<MailDetail email={sampleEmail} />);

      const aiDraftBtn = screen.getByRole('button', { name: /AI Draft Reply/i });

      expect(() => {
        fireEvent.click(aiDraftBtn);
      }).not.toThrow();
    });
  });

  describe('Archive button', () => {
    it('shows the Archive action for a non-archived email and calls back with its id', () => {
      const onToggleArchive = vi.fn();
      render(<MailDetail {...defaultProps} email={sampleEmail} onToggleArchive={onToggleArchive} />);

      const archiveBtn = screen.getByRole('button', { name: 'Archive email' });
      fireEvent.click(archiveBtn);

      expect(archiveBtn).toHaveTextContent('Archive');
      expect(onToggleArchive).toHaveBeenCalledWith(sampleEmail.id);
    });

    it('shows the Unarchive action for an already archived email', () => {
      const onToggleArchive = vi.fn();
      const archivedEmail: Email = { ...sampleEmail, folder: 'archive' };
      render(<MailDetail {...defaultProps} email={archivedEmail} onToggleArchive={onToggleArchive} />);

      const unarchiveBtn = screen.getByRole('button', { name: 'Unarchive email' });
      fireEvent.click(unarchiveBtn);

      expect(unarchiveBtn).toHaveTextContent('Unarchive');
      expect(onToggleArchive).toHaveBeenCalledWith(archivedEmail.id);
    });

    it('does not throw when onToggleArchive is undefined', () => {
      render(<MailDetail email={sampleEmail} />);

      expect(() => fireEvent.click(screen.getByRole('button', { name: 'Archive email' }))).not.toThrow();
    });
  });
});
