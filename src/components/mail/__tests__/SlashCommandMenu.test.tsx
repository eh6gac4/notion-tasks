import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandMenu, DEFAULT_SLASH_COMMANDS } from '../SlashCommandMenu';

describe('SlashCommandMenu Component', () => {
  const defaultProps = {
    isOpen: true,
    filterText: '',
    onSelectOption: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<SlashCommandMenu {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders popup menu with all 7 command options when isOpen is true', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();
      expect(screen.getByText('/task (Notion Task)')).toBeInTheDocument();
      expect(screen.getByText('/ai (AI Draft)')).toBeInTheDocument();
      expect(screen.getByText('/h1 (Heading 1)')).toBeInTheDocument();
      expect(screen.getByText('/h2 (Heading 2)')).toBeInTheDocument();
      expect(screen.getByText('/bold (Bold Text)')).toBeInTheDocument();
      expect(screen.getByText('/list (Bullet List)')).toBeInTheDocument();
      expect(screen.getByText('/code (Code Block)')).toBeInTheDocument();
    });

    it('filters commands list dynamically based on filterText and supports aliases', () => {
      const { rerender } = render(<SlashCommandMenu {...defaultProps} filterText="task" />);

      expect(screen.getByText('/task (Notion Task)')).toBeInTheDocument();
      expect(screen.queryByText('/list (Bullet List)')).not.toBeInTheDocument();

      rerender(<SlashCommandMenu {...defaultProps} filterText="h" />);
      expect(screen.getByText('/h1 (Heading 1)')).toBeInTheDocument();
      expect(screen.getByText('/h2 (Heading 2)')).toBeInTheDocument();
      expect(screen.queryByText('/task (Notion Task)')).not.toBeInTheDocument();

      rerender(<SlashCommandMenu {...defaultProps} filterText="bullet" />);
      expect(screen.getByText('/list (Bullet List)')).toBeInTheDocument();
    });

    it('triggers onSelectOption when an option item is clicked', () => {
      const onSelectOption = vi.fn();
      render(<SlashCommandMenu {...defaultProps} onSelectOption={onSelectOption} />);

      const aiOption = screen.getByTestId('slash-option-ai');
      fireEvent.click(aiOption);

      expect(onSelectOption).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ai', action: 'ai' })
      );
    });

    it('navigates options with ArrowDown/ArrowUp and selects on Enter key', () => {
      const onSelectOption = vi.fn();
      render(<SlashCommandMenu {...defaultProps} onSelectOption={onSelectOption} />);

      // Initially index 0 ('task')
      expect(screen.getByTestId('slash-option-task')).toHaveAttribute('aria-selected', 'true');

      // ArrowDown -> index 1 ('ai')
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(screen.getByTestId('slash-option-ai')).toHaveAttribute('aria-selected', 'true');

      // Enter -> selects 'ai'
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(onSelectOption).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ai' })
      );
    });
  });

  describe('Tier 2: Boundary & Edge Cases', () => {
    it('displays no matching commands message when filter has no results', () => {
      render(<SlashCommandMenu {...defaultProps} filterText="nonexistentcommand" />);

      expect(screen.getByText('No commands matching "nonexistentcommand"')).toBeInTheDocument();
    });

    it('wraps keyboard navigation index around from bottom to top', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      // Press ArrowUp on top item -> wraps to last item
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      const lastOption = DEFAULT_SLASH_COMMANDS[DEFAULT_SLASH_COMMANDS.length - 1];
      expect(screen.getByTestId(`slash-option-${lastOption.id}`)).toHaveAttribute('aria-selected', 'true');

      // Press ArrowDown -> wraps back to top item
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(screen.getByTestId('slash-option-task')).toHaveAttribute('aria-selected', 'true');
    });

    it('triggers onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<SlashCommandMenu {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when clicking outside menu container', () => {
      const onClose = vi.fn();
      render(
        <div>
          <button data-testid="outside-button">Outside</button>
          <SlashCommandMenu {...defaultProps} onClose={onClose} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles special characters in filterText without regex errors', () => {
      expect(() => {
        render(<SlashCommandMenu {...defaultProps} filterText="/[?*+()" />);
      }).not.toThrow();

      expect(screen.getByText('No commands matching "/[?*+()"')).toBeInTheDocument();
    });

    it('uses correct ARIA role="listbox" on container and role="option" on menu items', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const menuContainer = screen.getByTestId('slash-command-menu');
      expect(menuContainer).toHaveAttribute('role', 'listbox');

      const taskOption = screen.getByTestId('slash-option-task');
      expect(taskOption).toHaveAttribute('role', 'option');
      expect(taskOption).toHaveAttribute('aria-selected', 'true');
    });
  });
});
