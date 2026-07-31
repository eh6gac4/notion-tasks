import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailComposeModal } from '../MailComposeModal';

describe('MailComposeModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<MailComposeModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders compose modal dialog when isOpen is true', () => {
      render(<MailComposeModal {...defaultProps} />);

      expect(screen.getByTestId('compose-modal')).toBeInTheDocument();
      expect(screen.getByText('New Message (Notion Compose)')).toBeInTheDocument();
    });

    it('updates to, subject, and body form fields on typing', () => {
      render(<MailComposeModal {...defaultProps} />);

      const toInput = screen.getByTestId('compose-to-input');
      const subjectInput = screen.getByTestId('compose-subject-input');
      const bodyTextarea = screen.getByTestId('compose-body-textarea');

      fireEvent.change(toInput, { target: { value: 'recipient@example.com' } });
      fireEvent.change(subjectInput, { target: { value: 'Project Update' } });
      fireEvent.change(bodyTextarea, { target: { value: '# Hello World' } });

      expect(toInput).toHaveValue('recipient@example.com');
      expect(subjectInput).toHaveValue('Project Update');
      expect(bodyTextarea).toHaveValue('# Hello World');
    });

    it('toggles between Edit and Preview tabs', () => {
      render(<MailComposeModal {...defaultProps} />);

      const bodyTextarea = screen.getByTestId('compose-body-textarea');
      fireEvent.change(bodyTextarea, { target: { value: '**Bold Text**' } });

      const previewTabBtn = screen.getByRole('button', { name: 'Preview' });
      fireEvent.click(previewTabBtn);

      expect(screen.getByTestId('compose-markdown-preview')).toBeInTheDocument();
      expect(screen.queryByTestId('compose-body-textarea')).not.toBeInTheDocument();

      const editTabBtn = screen.getByRole('button', { name: 'Edit' });
      fireEvent.click(editTabBtn);

      expect(screen.getByTestId('compose-body-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('compose-body-textarea')).toHaveValue('**Bold Text**');
    });

    it('calls onSend callback with draft payload on form submit', () => {
      const onSend = vi.fn();
      render(<MailComposeModal {...defaultProps} onSend={onSend} />);

      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'Test Subject' } });
      fireEvent.change(screen.getByTestId('compose-body-textarea'), { target: { value: 'Test Body' } });

      const sendBtn = screen.getByTestId('compose-send-button');
      fireEvent.click(sendBtn);

      expect(onSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      });
    });

    it('calls onClose callback when close button or cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<MailComposeModal {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByLabelText('Close compose modal');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('disables send button when to or subject field is empty', () => {
      render(<MailComposeModal {...defaultProps} />);

      const sendBtn = screen.getByTestId('compose-send-button');
      expect(sendBtn).toBeDisabled();

      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: 'test@example.com' } });
      expect(sendBtn).toBeDisabled();

      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'Subject' } });
      expect(sendBtn).not.toBeDisabled();
    });

    it('pre-fills form fields when initialDraft prop is supplied', () => {
      const initialDraft = {
        to: 'preset@example.com',
        subject: 'Re: Initial Subject',
        body: 'Preset AI generated draft body text.',
      };

      render(<MailComposeModal {...defaultProps} initialDraft={initialDraft} />);

      expect(screen.getByTestId('compose-to-input')).toHaveValue('preset@example.com');
      expect(screen.getByTestId('compose-subject-input')).toHaveValue('Re: Initial Subject');
      expect(screen.getByTestId('compose-body-textarea')).toHaveValue('Preset AI generated draft body text.');
    });

    it('closes modal when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<MailComposeModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers slash command menu when typing / in body textarea', () => {
      render(<MailComposeModal {...defaultProps} />);

      const bodyTextarea = screen.getByTestId('compose-body-textarea');
      fireEvent.change(bodyTextarea, { target: { value: '/' } });

      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();
    });

    it('inserts slash command text into body and closes menu when option is selected', () => {
      render(<MailComposeModal {...defaultProps} />);

      const bodyTextarea = screen.getByTestId('compose-body-textarea');
      fireEvent.change(bodyTextarea, { target: { value: '/' } });

      const taskOption = screen.getByTestId('slash-option-task');
      fireEvent.click(taskOption);

      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
      expect(bodyTextarea).toHaveValue('[ ] ');
    });
  });
});
