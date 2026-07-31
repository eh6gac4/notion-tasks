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

describe('useMailShortcuts Hook', () => {
  it("navigates down to next email on 'j' key press", () => {
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
  });

  it("navigates up to previous email on 'k' key press", () => {
    const onSelectEmail = vi.fn();
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

  it("selects first email when pressing 'j' or 'k' with no email selected", () => {
    const onSelectEmail = vi.fn();
    renderHook(() =>
      useMailShortcuts({
        emails: mockEmails,
        selectedId: null,
        onSelectEmail,
        onOpenCompose: vi.fn(),
      })
    );

    fireEvent.keyDown(window, { key: 'j' });
    expect(onSelectEmail).toHaveBeenCalledWith('mail-1');
  });

  it("does not navigate past the boundaries of the list", () => {
    const onSelectEmail = vi.fn();
    renderHook(() =>
      useMailShortcuts({
        emails: mockEmails,
        selectedId: 'mail-3',
        onSelectEmail,
        onOpenCompose: vi.fn(),
      })
    );

    fireEvent.keyDown(window, { key: 'j' });
    expect(onSelectEmail).not.toHaveBeenCalled();

    const onSelectEmailTop = vi.fn();
    renderHook(() =>
      useMailShortcuts({
        emails: mockEmails,
        selectedId: 'mail-1',
        onSelectEmail: onSelectEmailTop,
        onOpenCompose: vi.fn(),
      })
    );

    fireEvent.keyDown(window, { key: 'k' });
    expect(onSelectEmailTop).not.toHaveBeenCalled();
  });

  it("triggers compose modal callback on 'c' key press", () => {
    const onOpenCompose = vi.fn();
    renderHook(() =>
      useMailShortcuts({
        emails: mockEmails,
        selectedId: 'mail-1',
        onSelectEmail: vi.fn(),
        onOpenCompose,
      })
    );

    fireEvent.keyDown(window, { key: 'c' });
    expect(onOpenCompose).toHaveBeenCalledTimes(1);
  });

  it('suppresses shortcuts when event target is an INPUT, TEXTAREA, or SELECT element', () => {
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

    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');

    document.body.appendChild(input);
    document.body.appendChild(textarea);
    document.body.appendChild(select);

    fireEvent.keyDown(input, { key: 'j' });
    fireEvent.keyDown(input, { key: 'c' });

    fireEvent.keyDown(textarea, { key: 'k' });
    fireEvent.keyDown(select, { key: 'c' });

    expect(onSelectEmail).not.toHaveBeenCalled();
    expect(onOpenCompose).not.toHaveBeenCalled();

    document.body.removeChild(input);
    document.body.removeChild(textarea);
    document.body.removeChild(select);
  });

  it('suppresses shortcuts when event target is inside a contentEditable container', () => {
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

    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    editableDiv.contentEditable = 'true';
    const childSpan = document.createElement('span');
    editableDiv.appendChild(childSpan);
    document.body.appendChild(editableDiv);

    fireEvent.keyDown(childSpan, { key: 'j' });
    fireEvent.keyDown(childSpan, { key: 'c' });

    expect(onSelectEmail).not.toHaveBeenCalled();
    expect(onOpenCompose).not.toHaveBeenCalled();

    document.body.removeChild(editableDiv);
  });

  it('ignores shortcuts when modifier keys (ctrlKey, metaKey, altKey) are pressed', () => {
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

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.keyDown(window, { key: 'c', altKey: true });

    expect(onSelectEmail).not.toHaveBeenCalled();
    expect(onOpenCompose).not.toHaveBeenCalled();
  });

  it('does nothing when disabled is set to true', () => {
    const onOpenCompose = vi.fn();
    renderHook(() =>
      useMailShortcuts({
        emails: mockEmails,
        selectedId: 'mail-1',
        onSelectEmail: vi.fn(),
        onOpenCompose,
        enabled: false,
      })
    );

    fireEvent.keyDown(window, { key: 'c' });
    expect(onOpenCompose).not.toHaveBeenCalled();
  });

  it('isEditingInput correctly identifies editable DOM targets', () => {
    const input = document.createElement('input');
    const div = document.createElement('div');
    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    editableDiv.contentEditable = 'true';

    expect(isEditingInput(input)).toBe(true);
    expect(isEditingInput(div)).toBe(false);
    expect(isEditingInput(editableDiv)).toBe(true);
    expect(isEditingInput(null)).toBe(false);
  });
});
