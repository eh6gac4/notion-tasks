import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AIDraftModal, PRESET_PROMPTS } from '../AIDraftModal';
import { Email } from '@/types/mail';

const sampleEmail: Email = {
  id: 'mail-200',
  sender: { name: 'Kaito Tanaka', email: 'kaito@example.com' },
  recipients: ['user@example.com'],
  subject: 'Cyberpunk UI Feedback',
  body: 'Please review the design tokens.',
  date: '2026-07-31T09:30:00Z',
  folder: 'inbox',
  isRead: true,
  isStarred: false,
};

describe('AIDraftModal Component', () => {
  const defaultProps = {
    isOpen: true,
    email: sampleEmail,
    onClose: vi.fn(),
    onInsertDraft: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<AIDraftModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders prompt form with preset prompt buttons', () => {
      render(<AIDraftModal {...defaultProps} />);

      expect(screen.getByTestId('ai-draft-modal')).toBeInTheDocument();
      expect(screen.getByTestId('ai-draft-prompt-textarea')).toBeInTheDocument();
      expect(screen.getByText('丁寧な返信')).toBeInTheDocument();
    });

    it('populates prompt textarea when a quick preset button is clicked', () => {
      render(<AIDraftModal {...defaultProps} />);

      const presetBtn = screen.getByTestId('preset-prompt-0');
      fireEvent.click(presetBtn);

      const promptTextarea = screen.getByTestId('ai-draft-prompt-textarea');
      expect(promptTextarea).toHaveValue(PRESET_PROMPTS[0].prompt);
    });

    it('displays CyberLoader loading state during AI draft generation', () => {
      render(<AIDraftModal {...defaultProps} />);

      fireEvent.change(screen.getByTestId('ai-draft-prompt-textarea'), {
        target: { value: 'Accept proposal' },
      });

      fireEvent.click(screen.getByTestId('ai-draft-generate-button'));

      expect(screen.getByTestId('ai-draft-loading')).toBeInTheDocument();
      expect(screen.getByText('GENERATING AI DRAFT...')).toBeInTheDocument();
    });

    it('displays generated draft preview and calls onInsertDraft on insert button click', () => {
      const onInsertDraft = vi.fn();
      render(<AIDraftModal {...defaultProps} onInsertDraft={onInsertDraft} />);

      fireEvent.change(screen.getByTestId('ai-draft-prompt-textarea'), {
        target: { value: 'Polite acceptance' },
      });

      fireEvent.click(screen.getByTestId('ai-draft-generate-button'));

      // Advance fake timers for simulated AI response
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.getByTestId('ai-draft-result-textarea')).toBeInTheDocument();

      const insertBtn = screen.getByTestId('ai-draft-insert-button');
      fireEvent.click(insertBtn);

      expect(onInsertDraft).toHaveBeenCalledWith(
        expect.stringContaining('Thank you for your email regarding "Cyberpunk UI Feedback"')
      );
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('disables generate button when prompt input field is empty or whitespace', () => {
      render(<AIDraftModal {...defaultProps} />);

      const generateBtn = screen.getByTestId('ai-draft-generate-button');
      expect(generateBtn).toBeDisabled();

      fireEvent.change(screen.getByTestId('ai-draft-prompt-textarea'), {
        target: { value: '   ' },
      });
      expect(generateBtn).toBeDisabled();
    });

    it('allows regenerating draft from result view', () => {
      render(<AIDraftModal {...defaultProps} />);

      fireEvent.change(screen.getByTestId('ai-draft-prompt-textarea'), {
        target: { value: 'First prompt' },
      });
      fireEvent.click(screen.getByTestId('ai-draft-generate-button'));

      act(() => {
        vi.advanceTimersByTime(600);
      });

      const regenBtn = screen.getByTestId('ai-draft-regenerate-button');
      fireEvent.click(regenBtn);

      expect(screen.getByTestId('ai-draft-loading')).toBeInTheDocument();
    });

    it('triggers onClose when Cancel button or top close button is clicked', () => {
      const onClose = vi.fn();
      render(<AIDraftModal {...defaultProps} onClose={onClose} />);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Escape key is pressed (when not generating)', () => {
      const onClose = vi.fn();
      render(<AIDraftModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles AI draft generation when email context is null gracefully', () => {
      render(<AIDraftModal {...defaultProps} email={null} />);

      fireEvent.change(screen.getByTestId('ai-draft-prompt-textarea'), {
        target: { value: 'General draft without email' },
      });
      fireEvent.click(screen.getByTestId('ai-draft-generate-button'));

      act(() => {
        vi.advanceTimersByTime(600);
      });

      const resultTextarea = screen.getByTestId('ai-draft-result-textarea') as HTMLTextAreaElement;
      expect(resultTextarea.value).toContain('Thank you for your email regarding "Reply"');
    });
  });
});
