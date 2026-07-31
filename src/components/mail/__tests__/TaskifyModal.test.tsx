import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskifyModal } from '../TaskifyModal';
import { Email } from '@/types/mail';

const sampleEmail: Email = {
  id: 'mail-100',
  sender: { name: 'Alex Rivers', email: 'alex@example.com' },
  recipients: ['user@example.com'],
  subject: 'Q3 Notion Integration Specs',
  body: 'Please review the attached specs.',
  date: '2026-07-31T09:30:00Z',
  folder: 'inbox',
  isRead: false,
  isStarred: true,
};

describe('TaskifyModal Component', () => {
  const defaultProps = {
    isOpen: true,
    email: sampleEmail,
    onClose: vi.fn(),
    onCreateTask: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('returns null when isOpen is false or email is null', () => {
      const { container: containerClosed } = render(<TaskifyModal {...defaultProps} isOpen={false} />);
      expect(containerClosed.firstChild).toBeNull();

      const { container: containerNullEmail } = render(<TaskifyModal {...defaultProps} email={null} />);
      expect(containerNullEmail.firstChild).toBeNull();
    });

    it('renders task creation modal dialog with title pre-filled from email.subject', () => {
      render(<TaskifyModal {...defaultProps} />);

      expect(screen.getByTestId('taskify-modal')).toBeInTheDocument();
      expect(screen.getByTestId('taskify-title-input')).toHaveValue('Q3 Notion Integration Specs');
    });

    it('pre-fills description field with email link and snippet context', () => {
      render(<TaskifyModal {...defaultProps} />);

      const descTextarea = screen.getByTestId('taskify-description-textarea') as HTMLTextAreaElement;
      expect(descTextarea.value).toContain('Converted from Email (mail-100)');
    });

    it('allows updating title, status, priority, and tags input fields', () => {
      render(<TaskifyModal {...defaultProps} />);

      const titleInput = screen.getByTestId('taskify-title-input');
      const statusSelect = screen.getByTestId('taskify-status-select');
      const prioritySelect = screen.getByTestId('taskify-priority-select');
      const tagsInput = screen.getByTestId('taskify-tags-input');

      fireEvent.change(titleInput, { target: { value: 'Updated Task Title' } });
      fireEvent.change(statusSelect, { target: { value: 'In Progress' } });
      fireEvent.change(prioritySelect, { target: { value: 'High' } });
      fireEvent.change(tagsInput, { target: { value: 'Urgent, Feature' } });

      expect(titleInput).toHaveValue('Updated Task Title');
      expect(statusSelect).toHaveValue('In Progress');
      expect(prioritySelect).toHaveValue('High');
      expect(tagsInput).toHaveValue('Urgent, Feature');
    });

    it('triggers onCreateTask callback with complete task payload on form submission', () => {
      const onCreateTask = vi.fn();
      render(<TaskifyModal {...defaultProps} onCreateTask={onCreateTask} />);

      fireEvent.click(screen.getByTestId('taskify-submit-button'));

      expect(onCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Q3 Notion Integration Specs',
          status: 'To Do',
          priority: 'Medium',
          tags: ['Email', 'Task'],
        })
      );
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('uses fallback title when email subject is empty or whitespace', () => {
      const emptySubjectEmail: Email = {
        ...sampleEmail,
        subject: '   ',
      };
      render(<TaskifyModal {...defaultProps} email={emptySubjectEmail} />);

      expect(screen.getByTestId('taskify-title-input')).toHaveValue('Task from email');
    });

    it('disables submit button when title field is cleared', () => {
      render(<TaskifyModal {...defaultProps} />);

      const titleInput = screen.getByTestId('taskify-title-input');
      const submitBtn = screen.getByTestId('taskify-submit-button');

      fireEvent.change(titleInput, { target: { value: '' } });
      expect(submitBtn).toBeDisabled();
    });

    it('triggers onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<TaskifyModal {...defaultProps} onClose={onClose} />);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<TaskifyModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('parses comma-separated tag input into array of clean tag strings', () => {
      const onCreateTask = vi.fn();
      render(<TaskifyModal {...defaultProps} onCreateTask={onCreateTask} />);

      fireEvent.change(screen.getByTestId('taskify-tags-input'), { target: { value: 'Bug,  Frontend , UI ' } });
      fireEvent.click(screen.getByTestId('taskify-submit-button'));

      expect(onCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['Bug', 'Frontend', 'UI'],
        })
      );
    });
  });
});
