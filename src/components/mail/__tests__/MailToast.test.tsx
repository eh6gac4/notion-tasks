import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MailToast } from '../MailToast';

describe('MailToast Component', () => {
  const defaultProps = {
    message: 'Operation completed successfully',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('returns null when message prop is null or empty string', () => {
      const { container: containerNull } = render(<MailToast message={null} onClose={vi.fn()} />);
      expect(containerNull.firstChild).toBeNull();

      const { container: containerEmpty } = render(<MailToast message="" onClose={vi.fn()} />);
      expect(containerEmpty.firstChild).toBeNull();
    });

    it('renders toast message text and status icon when message is provided', () => {
      render(<MailToast {...defaultProps} type="success" />);

      expect(screen.getByTestId('mail-toast')).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('triggers onClose when manual close button (✕) is clicked', () => {
      const onClose = vi.fn();
      render(<MailToast {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByLabelText('Close notification');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose automatically after specified duration timer expires', () => {
      const onClose = vi.fn();
      render(<MailToast {...defaultProps} duration={3000} onClose={onClose} />);

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('applies correct type styles for success, info, and error variants', () => {
      const { rerender } = render(<MailToast {...defaultProps} type="success" />);
      expect(screen.getByTestId('mail-toast')).toHaveClass('text-[var(--accent)]');

      rerender(<MailToast {...defaultProps} type="error" />);
      expect(screen.getByTestId('mail-toast')).toHaveClass('text-red-400');
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('resets auto-dismiss timer when message prop changes', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <MailToast message="Message 1" duration={3000} onClose={onClose} />
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Rerender with new message before 3000ms
      rerender(<MailToast message="Message 2" duration={3000} onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // 4000ms total from start, but reset occurred at 2000ms -> should not have fired yet
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables auto-dismiss timer when duration is 0', () => {
      const onClose = vi.fn();
      render(<MailToast {...defaultProps} duration={0} onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('clears timeout on component unmount to prevent memory leaks', () => {
      const onClose = vi.fn();
      const { unmount } = render(<MailToast {...defaultProps} duration={3000} onClose={onClose} />);

      unmount();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
