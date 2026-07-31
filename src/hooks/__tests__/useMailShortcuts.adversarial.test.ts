import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useMailShortcuts, isEditingInput } from '../useMailShortcuts';
import type { Email } from '@/types/mail';

const mockEmails: Email[] = [
  {
    id: 'mail-1',
    subject: 'Email 1',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    date: '2026-07-31T09:00:00Z',
    body: 'Body 1',
    recipients: ['user@example.com'],
    sender: { name: 'Sender 1', email: 's1@example.com' },
  },
  {
    id: 'mail-2',
    subject: 'Email 2',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    date: '2026-07-31T09:05:00Z',
    body: 'Body 2',
    recipients: ['user@example.com'],
    sender: { name: 'Sender 2', email: 's2@example.com' },
  },
  {
    id: 'mail-3',
    subject: 'Email 3',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    date: '2026-07-31T09:10:00Z',
    body: 'Body 3',
    recipients: ['user@example.com'],
    sender: { name: 'Sender 3', email: 's3@example.com' },
  },
];

describe('Adversarial Verification Suite: Keyboard Shortcuts Focus Guard', () => {
  describe('1. Non-HTMLElement Element targets (SVG elements, etc.)', () => {
    it('returns true when target is an SVG Element inside an option/select', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      select.appendChild(option);

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      const path = document.createElementNS(svgNs, 'path');
      svg.appendChild(path);

      option.appendChild(svg);
      document.body.appendChild(select);

      expect(isEditingInput(path)).toBe(true);
      expect(isEditingInput(svg)).toBe(true);

      document.body.removeChild(select);
    });

    it('returns true when target is an SVG Element inside a contenteditable container with explicit contenteditable="true"', () => {
      const editableDiv = document.createElement('div');
      editableDiv.setAttribute('contenteditable', 'true');

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      const path = document.createElementNS(svgNs, 'path');
      svg.appendChild(path);
      editableDiv.appendChild(svg);
      document.body.appendChild(editableDiv);

      expect(isEditingInput(path)).toBe(true);
      expect(isEditingInput(svg)).toBe(true);

      document.body.removeChild(editableDiv);
    });

    it('returns false when target is an SVG Element inside a non-editable container', () => {
      const button = document.createElement('button');
      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      const path = document.createElementNS(svgNs, 'path');
      svg.appendChild(path);
      button.appendChild(svg);
      document.body.appendChild(button);

      expect(isEditingInput(path)).toBe(false);
      expect(isEditingInput(svg)).toBe(false);

      document.body.removeChild(button);
    });

    it('suppresses global shortcuts when pressing j/k/c on an SVG element inside select/option', () => {
      const onSelectEmail = vi.fn();
      const onOpenCompose = vi.fn();

      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail,
          onOpenCompose,
        })
      );

      const select = document.createElement('select');
      const option = document.createElement('option');
      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      const path = document.createElementNS(svgNs, 'path');
      svg.appendChild(path);
      option.appendChild(svg);
      select.appendChild(option);
      document.body.appendChild(select);

      fireEvent.keyDown(path, { key: 'j' });
      fireEvent.keyDown(path, { key: 'k' });
      fireEvent.keyDown(path, { key: 'c' });

      expect(onSelectEmail).not.toHaveBeenCalled();
      expect(onOpenCompose).not.toHaveBeenCalled();

      document.body.removeChild(select);
    });
  });

  describe('2. Dropdown elements: <option> and <optgroup>', () => {
    it('returns true when target is <option> directly', () => {
      const option = document.createElement('option');
      expect(isEditingInput(option)).toBe(true);
    });

    it('returns true when target is <optgroup> directly', () => {
      const optgroup = document.createElement('optgroup');
      expect(isEditingInput(optgroup)).toBe(true);
    });

    it('returns true when target is a child inside <option> or <optgroup>', () => {
      const optgroup = document.createElement('optgroup');
      const option = document.createElement('option');
      const span = document.createElement('span');
      option.appendChild(span);
      optgroup.appendChild(option);
      document.body.appendChild(optgroup);

      expect(isEditingInput(span)).toBe(true);

      document.body.removeChild(optgroup);
    });

    it('suppresses shortcuts when focus is on option or optgroup', () => {
      const onSelectEmail = vi.fn();
      const onOpenCompose = vi.fn();

      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail,
          onOpenCompose,
        })
      );

      const select = document.createElement('select');
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Group 1';
      const option = document.createElement('option');
      option.value = 'val1';
      optgroup.appendChild(option);
      select.appendChild(optgroup);
      document.body.appendChild(select);

      fireEvent.keyDown(option, { key: 'j' });
      fireEvent.keyDown(optgroup, { key: 'k' });
      fireEvent.keyDown(option, { key: 'c' });

      expect(onSelectEmail).not.toHaveBeenCalled();
      expect(onOpenCompose).not.toHaveBeenCalled();

      document.body.removeChild(select);
    });
  });

  describe('3. Contenteditable elements and variations', () => {
    it('returns true for contenteditable="true"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      expect(isEditingInput(div)).toBe(true);
    });

    it('returns true for contenteditable="plaintext-only"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'plaintext-only');
      expect(isEditingInput(div)).toBe(true);
    });

    it('PROBE DEFECT 1: returns false for contenteditable="" (boolean attribute syntax without "true")', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', '');
      // Expect current code behavior to fail boolean contenteditable check
      expect(isEditingInput(div)).toBe(false);
    });

    it('PROBE DEFECT 2: returns false for contenteditable attribute with no value set in HTML (<div contenteditable>)', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div contenteditable>editable text</div>';
      const div = container.firstElementChild as HTMLElement;
      // Expect current code behavior to fail boolean contenteditable check
      expect(isEditingInput(div)).toBe(false);
    });

    it('returns true when target is a deeply nested element inside contenteditable="true"', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      const p = document.createElement('p');
      const span = document.createElement('span');
      const em = document.createElement('em');
      span.appendChild(em);
      p.appendChild(span);
      div.appendChild(p);
      document.body.appendChild(div);

      expect(isEditingInput(em)).toBe(true);

      document.body.removeChild(div);
    });

    it('suppresses shortcuts when typing in a contenteditable="true" div', () => {
      const onSelectEmail = vi.fn();
      const onOpenCompose = vi.fn();

      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail,
          onOpenCompose,
        })
      );

      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);

      fireEvent.keyDown(div, { key: 'j' });
      fireEvent.keyDown(div, { key: 'k' });
      fireEvent.keyDown(div, { key: 'c' });

      expect(onSelectEmail).not.toHaveBeenCalled();
      expect(onOpenCompose).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });

  describe('4. Shortcuts execution when focus is outside inputs', () => {
    it("navigates forward with 'j' and backward with 'k' when focused on window", () => {
      const onSelectEmail = vi.fn();
      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail,
          onOpenCompose: vi.fn(),
        })
      );

      fireEvent.keyDown(window, { key: 'j' });
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');

      onSelectEmail.mockClear();

      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-2',
          onSelectEmail,
          onOpenCompose: vi.fn(),
        })
      );

      fireEvent.keyDown(window, { key: 'k' });
      expect(onSelectEmail).toHaveBeenCalledWith('mail-1');
    });

    it("triggers compose modal on 'c' when focused on document.body or normal button", () => {
      const onOpenCompose = vi.fn();
      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail: vi.fn(),
          onOpenCompose,
        })
      );

      const button = document.createElement('button');
      document.body.appendChild(button);

      fireEvent.keyDown(button, { key: 'c' });
      expect(onOpenCompose).toHaveBeenCalledTimes(1);

      document.body.removeChild(button);
    });

    it("works with uppercase 'J', 'K', 'C' key events", () => {
      const onSelectEmail = vi.fn();
      const onOpenCompose = vi.fn();

      renderHook(() =>
        useMailShortcuts({
          emails: mockEmails,
          selectedId: 'mail-1',
          onSelectEmail,
          onOpenCompose,
        })
      );

      fireEvent.keyDown(window, { key: 'J' });
      expect(onSelectEmail).toHaveBeenCalledWith('mail-2');

      fireEvent.keyDown(window, { key: 'C' });
      expect(onOpenCompose).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Non-Element and special target handling', () => {
    it('returns false for null, undefined, text node, window, and document targets', () => {
      expect(isEditingInput(null)).toBe(false);
      expect(isEditingInput(undefined as unknown as EventTarget)).toBe(false);
      expect(isEditingInput(window as unknown as EventTarget)).toBe(false);
      expect(isEditingInput(document as unknown as EventTarget)).toBe(false);

      const textNode = document.createTextNode('sample text');
      expect(isEditingInput(textNode as unknown as EventTarget)).toBe(false);
    });
  });
});
