import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailDetail } from '../MailDetail';
import { Email } from '@/types/mail';

const sampleEmail: Email = {
  id: 'mail-100',
  sender: {
    name: 'Alex Rivers',
    email: 'alex.rivers@notion.so',
    avatar: 'AR',
  },
  recipients: ['user1@notion-tasks.local', 'user2@notion-tasks.local'],
  subject: 'Q3 Product Roadmap Review & Notion Tasks Integration',
  body: `# Roadmap Spec\n\nThis is the markdown body of the email.`,
  date: '2026-07-31T09:30:00Z',
  folder: 'inbox',
  isRead: true,
  isStarred: false,
};

describe('MailDetail Component', () => {
  const defaultProps = {
    email: sampleEmail,
    onTaskify: vi.fn(),
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

    it('renders full email details including subject, folder badge, sender, recipients, and body', () => {
      render(<MailDetail {...defaultProps} />);

      expect(screen.getByText(sampleEmail.subject)).toBeInTheDocument();
      expect(screen.getByText('inbox')).toBeInTheDocument();
      expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
      expect(screen.getByText('<alex.rivers@notion.so>')).toBeInTheDocument();
      expect(screen.getByText('to user1@notion-tasks.local, user2@notion-tasks.local')).toBeInTheDocument();
      expect(screen.getByText(/Roadmap Spec/)).toBeInTheDocument();
    });

    it('triggers onTaskify callback when Notion Taskify button is clicked', () => {
      const onTaskify = vi.fn();
      render(<MailDetail {...defaultProps} onTaskify={onTaskify} />);

      const taskifyBtn = screen.getByRole('button', { name: /Taskify to Notion/i });
      fireEvent.click(taskifyBtn);

      expect(onTaskify).toHaveBeenCalledWith(sampleEmail);
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

    it('prevents crashes when optional callback handlers (onTaskify/onAIDraft) are undefined', () => {
      render(<MailDetail email={sampleEmail} />);

      const taskifyBtn = screen.getByRole('button', { name: /Taskify to Notion/i });
      const aiDraftBtn = screen.getByRole('button', { name: /AI Draft Reply/i });

      expect(() => {
        fireEvent.click(taskifyBtn);
        fireEvent.click(aiDraftBtn);
      }).not.toThrow();
    });
  });
});
