import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MailComposeModal } from '../MailComposeModal';
import { ComposeDraft } from '@/types/mail';

describe('MailComposeModal Stress & Boundary Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Complex Markdown Preview & Rapid Tab Switching', () => {
    const complexMarkdown = `
# Main Header H1
## Sub Header H2
### Section H3

This is **bold text**, *italic text*, and ~~strikethrough~~.
Here is an \`inline code\` snippet.

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

- Bullet item 1
- Bullet item 2
  - Sub item 2.1

1. Numbered 1
2. Numbered 2

> This is a blockquote with **bold** inside.

[Notion Link](https://notion.so)
![Logo](https://via.placeholder.com/150)

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |

<script>alert("xss test")</script>
`;

    it('renders complex markdown in preview tab without crashing or throwing errors', () => {
      render(<MailComposeModal {...defaultProps} initialDraft={{ body: complexMarkdown }} />);

      const previewTabBtn = screen.getByRole('button', { name: 'Preview' });
      fireEvent.click(previewTabBtn);

      const previewContainer = screen.getByTestId('compose-markdown-preview');
      expect(previewContainer).toBeInTheDocument();
      expect(previewContainer.textContent).toContain('Main Header H1');
      expect(previewContainer.textContent).toContain('Sub Header H2');
      expect(previewContainer.textContent).toContain('function greet');
      expect(previewContainer.textContent).toContain('Notion Link');
    });

    it('handles rapid switching between Edit and Preview tabs 50 times', () => {
      render(<MailComposeModal {...defaultProps} initialDraft={{ body: complexMarkdown }} />);

      const previewTabBtn = screen.getByRole('button', { name: 'Preview' });

      for (let i = 0; i < 50; i++) {
        fireEvent.click(previewTabBtn);
        expect(screen.getByTestId('compose-markdown-preview')).toBeInTheDocument();

        const editTabBtn = screen.getByRole('button', { name: 'Edit' });
        fireEvent.click(editTabBtn);
        expect(screen.getByTestId('compose-body-textarea')).toBeInTheDocument();
      }

      expect(screen.getByTestId('compose-body-textarea')).toHaveValue(complexMarkdown);
    });

    it('handles empty or malformed markdown strings in preview tab gracefully', () => {
      const edgeCases = ['', '   ', '### ', '```', '[[[[[', '<><><>', '***', '---'];

      const { rerender } = render(<MailComposeModal {...defaultProps} initialDraft={{ body: '' }} />);

      const previewTabBtn = screen.getByRole('button', { name: 'Preview' });
      fireEvent.click(previewTabBtn);

      for (const text of edgeCases) {
        rerender(<MailComposeModal {...defaultProps} initialDraft={{ body: text }} />);
        // Clicking Preview tab again because initialDraft change resets activeTab to 'edit'
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        expect(screen.getByTestId('compose-markdown-preview')).toBeInTheDocument();
      }
    });
  });

  describe('2. Caret Insertion & Slash Command Menu Across Multi-Line Documents', () => {
    it('inserts slash option at the beginning of multi-line body', () => {
      render(<MailComposeModal {...defaultProps} initialDraft={{ body: '' }} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;

      fireEvent.change(bodyTextarea, { target: { value: '/h1' } });
      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      const h1Option = screen.getByTestId('slash-option-h1');
      fireEvent.click(h1Option);

      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
      expect(bodyTextarea.value).toBe('# ');
    });

    it('inserts slash option correctly in middle of multi-line document', () => {
      render(<MailComposeModal {...defaultProps} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;

      const initialText = 'Line 1\n/task\nLine 3';
      // Set value and simulate selection at end of line 2
      fireEvent.change(bodyTextarea, { target: { value: initialText, selectionStart: 12, selectionEnd: 12 } });

      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      const taskOption = screen.getByTestId('slash-option-task');
      fireEvent.click(taskOption);

      expect(bodyTextarea.value).toBe('Line 1\n[ ] \nLine 3');
    });

    it('inserts code block command (/code) spanning multi-line template', () => {
      render(<MailComposeModal {...defaultProps} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;

      fireEvent.change(bodyTextarea, { target: { value: 'Intro text\n/code' } });
      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      const codeOption = screen.getByTestId('slash-option-code');
      fireEvent.click(codeOption);

      expect(bodyTextarea.value).toBe('Intro text\n```\n\n```');
    });

    it('filters command list when typing /ai or /bold', () => {
      render(<MailComposeModal {...defaultProps} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;

      fireEvent.change(bodyTextarea, { target: { value: '/bold' } });
      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();
      expect(screen.getByTestId('slash-option-bold')).toBeInTheDocument();
      expect(screen.queryByTestId('slash-option-h1')).not.toBeInTheDocument();
    });

    it('does NOT open slash command menu for URLs or slashes in middle of words', () => {
      render(<MailComposeModal {...defaultProps} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;

      fireEvent.change(bodyTextarea, { target: { value: 'Visit https://notion.so' } });
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();

      fireEvent.change(bodyTextarea, { target: { value: 'folder/subfolder/file' } });
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
    });
  });

  describe('3. Dynamic initialDraft Synchronization', () => {
    function Wrapper({ initialDraft }: { initialDraft?: Partial<ComposeDraft> }) {
      return <MailComposeModal {...defaultProps} initialDraft={initialDraft} />;
    }

    it('synchronizes state when initialDraft prop changes dynamically', () => {
      const { rerender } = render(<Wrapper initialDraft={{ to: 'first@a.com', subject: 'First' }} />);

      expect(screen.getByTestId('compose-to-input')).toHaveValue('first@a.com');
      expect(screen.getByTestId('compose-subject-input')).toHaveValue('First');

      // Update initialDraft dynamically
      rerender(<Wrapper initialDraft={{ to: 'second@b.com', subject: 'Second', body: 'New Body' }} />);

      expect(screen.getByTestId('compose-to-input')).toHaveValue('second@b.com');
      expect(screen.getByTestId('compose-subject-input')).toHaveValue('Second');
      expect(screen.getByTestId('compose-body-textarea')).toHaveValue('New Body');
    });

    it('resets slash menu open state and active tab when reopened or prop updated', () => {
      const { rerender } = render(<MailComposeModal {...defaultProps} isOpen={true} />);
      const bodyTextarea = screen.getByTestId('compose-body-textarea');

      // Open slash menu
      fireEvent.change(bodyTextarea, { target: { value: '/' } });
      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      // Close and reopen modal
      rerender(<MailComposeModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('compose-modal')).not.toBeInTheDocument();

      rerender(<MailComposeModal {...defaultProps} isOpen={true} />);
      expect(screen.getByTestId('compose-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
    });
  });

  describe('4. Esc Key Hierarchy & Hotkey Handling', () => {
    it('closes modal when Escape is pressed and slash menu is CLOSED', () => {
      const onClose = vi.fn();
      render(<MailComposeModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes ONLY slash menu (NOT modal) when Escape is pressed while slash menu is OPEN', () => {
      const onClose = vi.fn();
      render(<MailComposeModal {...defaultProps} onClose={onClose} />);

      const bodyTextarea = screen.getByTestId('compose-body-textarea');
      fireEvent.change(bodyTextarea, { target: { value: '/' } });

      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      // Press Escape to close slash menu
      fireEvent.keyDown(window, { key: 'Escape' });

      // Slash command menu should be closed
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
      // Modal's onClose callback should NOT have been called
      expect(onClose).not.toHaveBeenCalled();

      // Press Escape again to close modal
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('allows navigating slash command menu options with ArrowDown, ArrowUp, and selecting with Enter', () => {
      render(<MailComposeModal {...defaultProps} />);

      const bodyTextarea = screen.getByTestId('compose-body-textarea') as HTMLTextAreaElement;
      fireEvent.change(bodyTextarea, { target: { value: '/' } });

      expect(screen.getByTestId('slash-command-menu')).toBeInTheDocument();

      // Press ArrowDown to select second option (/ai)
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Press Enter to select option
      fireEvent.keyDown(window, { key: 'Enter' });

      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
      expect(bodyTextarea.value).toBe('/ai ');
    });
  });

  describe('5. Form Submission Validation (To/Subject Validation)', () => {
    it('disables send button when To field is empty or contains only whitespace', () => {
      render(<MailComposeModal {...defaultProps} />);

      const toInput = screen.getByTestId('compose-to-input');
      const subjectInput = screen.getByTestId('compose-subject-input');
      const sendBtn = screen.getByTestId('compose-send-button');

      // Both empty
      expect(sendBtn).toBeDisabled();

      // Subject filled, To empty
      fireEvent.change(subjectInput, { target: { value: 'Valid Subject' } });
      expect(sendBtn).toBeDisabled();

      // To filled with spaces only
      fireEvent.change(toInput, { target: { value: '   ' } });
      expect(sendBtn).toBeDisabled();

      // To filled with valid text
      fireEvent.change(toInput, { target: { value: 'user@example.com' } });
      expect(sendBtn).not.toBeDisabled();
    });

    it('disables send button when Subject field is empty or contains only whitespace', () => {
      render(<MailComposeModal {...defaultProps} />);

      const toInput = screen.getByTestId('compose-to-input');
      const subjectInput = screen.getByTestId('compose-subject-input');
      const sendBtn = screen.getByTestId('compose-send-button');

      fireEvent.change(toInput, { target: { value: 'user@example.com' } });

      // Subject empty
      expect(sendBtn).toBeDisabled();

      // Subject filled with spaces only
      fireEvent.change(subjectInput, { target: { value: '       ' } });
      expect(sendBtn).toBeDisabled();

      // Subject filled with valid text
      fireEvent.change(subjectInput, { target: { value: 'Actual Subject' } });
      expect(sendBtn).not.toBeDisabled();
    });

    it('allows submission when Body is empty, but To and Subject are valid', () => {
      const onSend = vi.fn();
      render(<MailComposeModal {...defaultProps} onSend={onSend} />);

      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: 'user@domain.com' } });
      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'Blank Body Mail' } });

      const sendBtn = screen.getByTestId('compose-send-button');
      expect(sendBtn).not.toBeDisabled();

      fireEvent.click(sendBtn);
      expect(onSend).toHaveBeenCalledWith({
        to: 'user@domain.com',
        subject: 'Blank Body Mail',
        body: '',
      });
    });

    it('prevents form submit action if To or Subject is whitespace-only even if submit is triggered directly', () => {
      const onSend = vi.fn();
      render(<MailComposeModal {...defaultProps} onSend={onSend} />);

      fireEvent.change(screen.getByTestId('compose-to-input'), { target: { value: '  ' } });
      fireEvent.change(screen.getByTestId('compose-subject-input'), { target: { value: 'Subject' } });

      const form = screen.getByTestId('compose-modal').querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(onSend).not.toHaveBeenCalled();
    });
  });
});
