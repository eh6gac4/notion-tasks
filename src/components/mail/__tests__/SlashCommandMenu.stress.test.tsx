import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandMenu, DEFAULT_SLASH_COMMANDS } from '../SlashCommandMenu';

describe('SlashCommandMenu Empirical Stress & Verification Test Suite', () => {
  const defaultProps = {
    isOpen: true,
    filterText: '',
    onSelectOption: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Keyboard Navigation Cycle & Wrapping Stress', () => {
    it('cycles ArrowDown through all items wrapping back to index 0', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const total = DEFAULT_SLASH_COMMANDS.length; // 7 items (indices 0..6)
      expect(screen.getByTestId('slash-option-task')).toHaveAttribute('aria-selected', 'true');

      // Loop ArrowDown full cycle twice (14 presses)
      for (let i = 0; i < total * 2; i++) {
        const expectedIndex = i % total;
        const expectedId = DEFAULT_SLASH_COMMANDS[expectedIndex].id;
        expect(screen.getByTestId(`slash-option-${expectedId}`)).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      }
      expect(screen.getByTestId('slash-option-task')).toHaveAttribute('aria-selected', 'true');
    });

    it('cycles ArrowUp backwards wrapping from index 0 to last item', () => {
      render(<SlashCommandMenu {...defaultProps} />);

      const total = DEFAULT_SLASH_COMMANDS.length; // 7 items
      expect(screen.getByTestId('slash-option-task')).toHaveAttribute('aria-selected', 'true');

      // ArrowUp from 0 should land on index 6 (code)
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(screen.getByTestId('slash-option-code')).toHaveAttribute('aria-selected', 'true');

      // Continue ArrowUp for another cycle
      for (let i = total - 1; i >= 0; i--) {
        const expectedId = DEFAULT_SLASH_COMMANDS[i].id;
        expect(screen.getByTestId(`slash-option-${expectedId}`)).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      }
      expect(screen.getByTestId('slash-option-code')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('2. Dynamic Query Filtering (Empirical Multi-Field Match Testing)', () => {
    const queryCases = [
      { query: '', expectedCount: 7, expectedIds: ['task', 'ai', 'h1', 'h2', 'bold', 'list', 'code'] },
      { query: '/t', expectedCount: 7, expectedIds: ['task', 'ai', 'h1', 'h2', 'bold', 'list', 'code'] }, // 't' in all descriptions
      { query: '/ta', expectedCount: 1, expectedIds: ['task'] },
      { query: '/task', expectedCount: 1, expectedIds: ['task'] },
      { query: '/h', expectedCount: 2, expectedIds: ['h1', 'h2'] },
      { query: '/h1', expectedCount: 1, expectedIds: ['h1'] },
      { query: '/h2', expectedCount: 1, expectedIds: ['h2'] },
      { query: '/bo', expectedCount: 1, expectedIds: ['bold'] },
      { query: '/bold', expectedCount: 1, expectedIds: ['bold'] },
      { query: '/li', expectedCount: 2, expectedIds: ['list', 'task'] }, // 'li' in 'list' and 'line' (task description)
      { query: '/list', expectedCount: 1, expectedIds: ['list'] },
      { query: '/co', expectedCount: 2, expectedIds: ['code', 'task'] }, // 'co' in 'code' and 'Convert' (task description)
      { query: '/code', expectedCount: 1, expectedIds: ['code'] },
      { query: '/bullet', expectedCount: 1, expectedIds: ['list'] }, // alias
      { query: '/heading', expectedCount: 2, expectedIds: ['h1', 'h2'] }, // alias
      { query: '/xyz', expectedCount: 0, expectedIds: [] },
    ];

    queryCases.forEach(({ query, expectedCount, expectedIds }) => {
      it(`correctly filters query "${query}" into ${expectedCount} options based on multi-field matching`, () => {
        render(<SlashCommandMenu {...defaultProps} filterText={query} />);

        if (expectedCount === 0) {
          expect(screen.getByText(new RegExp(`No commands matching "${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))).toBeInTheDocument();
          expect(screen.queryAllByRole('option')).toHaveLength(0);
        } else {
          const options = screen.getAllByRole('option');
          expect(options).toHaveLength(expectedCount);
          expectedIds.forEach((id) => {
            expect(screen.getByTestId(`slash-option-${id}`)).toBeInTheDocument();
          });
        }
      });
    });
  });

  describe('3. Key Selection & Boundary Clamping Behavior', () => {
    it('verifies Enter key selects the visually highlighted option when list contracts', () => {
      const onSelectOption = vi.fn();
      const { rerender } = render(
        <SlashCommandMenu {...defaultProps} filterText="" onSelectOption={onSelectOption} />
      );

      // Navigate to index 6 ('code')
      for (let i = 0; i < 6; i++) {
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      }

      // Filter contracts to "/h" (h1, h2)
      rerender(<SlashCommandMenu {...defaultProps} filterText="/h" onSelectOption={onSelectOption} />);

      // Press Enter
      fireEvent.keyDown(window, { key: 'Enter' });

      // Should select 'h2' (since clamped safeSelectedIndex is 1)
      expect(onSelectOption).toHaveBeenCalledWith(expect.objectContaining({ id: 'h2' }));
    });

    it('demonstrates keypress swallowing flaw when selectedIndex state is stale after filter list contraction', () => {
      const onSelectOption = vi.fn();
      const { rerender } = render(
        <SlashCommandMenu {...defaultProps} filterText="" onSelectOption={onSelectOption} />
      );

      // Navigate down to item at index 6 ('code')
      for (let i = 0; i < 6; i++) {
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      }
      expect(screen.getByTestId('slash-option-code')).toHaveAttribute('aria-selected', 'true');

      // Filter changes to "/h" (2 items: h1 at index 0, h2 at index 1)
      rerender(<SlashCommandMenu {...defaultProps} filterText="/h" onSelectOption={onSelectOption} />);

      // safeSelectedIndex clamps display to index 1 ('h2')
      expect(screen.getByTestId('slash-option-h2')).toHaveAttribute('aria-selected', 'true');

      // Press ArrowUp: user expects selection to move from h2 (index 1) to h1 (index 0)
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      // EMPIRICAL OBSERVATION:
      // prev state is 6. (6 - 1 + 2) % 2 = 7 % 2 = 1.
      // selectedIndex state becomes 1, so safeSelectedIndex remains 1 ('h2').
      // The keypress was swallowed! h2 remains selected.
      const selectedAfterFirstUp = screen.getByTestId('slash-option-h2').getAttribute('aria-selected');
      expect(selectedAfterFirstUp).toBe('true'); // Keypress swallowed!

      // On second ArrowUp press, prev is 1, so (1 - 1 + 2) % 2 = 0.
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      expect(screen.getByTestId('slash-option-h1')).toHaveAttribute('aria-selected', 'true'); // Now moves to h1!
    });
  });

  describe('4. Dismissal Behavior Stress', () => {
    it('handles Escape key dismissal cleanly', () => {
      const onClose = vi.fn();
      render(<SlashCommandMenu {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles click-outside dismissal cleanly', () => {
      const onClose = vi.fn();
      render(
        <div>
          <div data-testid="outside-area">Outside</div>
          <SlashCommandMenu {...defaultProps} onClose={onClose} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside-area'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger onClose when clicking inside the menu', () => {
      const onClose = vi.fn();
      render(<SlashCommandMenu {...defaultProps} onClose={onClose} />);

      const menuHeader = screen.getByText('Notion Commands');
      fireEvent.mouseDown(menuHeader);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('5. Accessibility Roles & Dynamic Query State', () => {
    it('maintains role="listbox" on container and role="option" on all items dynamically across queries', () => {
      const { rerender } = render(<SlashCommandMenu {...defaultProps} filterText="" />);

      const container = screen.getByTestId('slash-command-menu');
      expect(container).toHaveAttribute('role', 'listbox');
      expect(container).toHaveAttribute('aria-label', 'Slash Commands');

      let options = screen.getAllByRole('option');
      expect(options.length).toBe(7);

      // Verify exactly one item has aria-selected="true"
      let selectedOptions = options.filter((el) => el.getAttribute('aria-selected') === 'true');
      expect(selectedOptions).toHaveLength(1);
      expect(selectedOptions[0]).toHaveAttribute('data-testid', 'slash-option-task');

      // Change query to "/code"
      rerender(<SlashCommandMenu {...defaultProps} filterText="/code" />);
      options = screen.getAllByRole('option');
      expect(options.length).toBe(1);
      selectedOptions = options.filter((el) => el.getAttribute('aria-selected') === 'true');
      expect(selectedOptions).toHaveLength(1);
      expect(selectedOptions[0]).toHaveAttribute('data-testid', 'slash-option-code');

      // Change query to unmatched "/xyz"
      rerender(<SlashCommandMenu {...defaultProps} filterText="/xyz" />);
      expect(screen.queryAllByRole('option')).toHaveLength(0);
      expect(screen.getByTestId('slash-command-menu')).toHaveAttribute('role', 'listbox');
    });
  });
});
