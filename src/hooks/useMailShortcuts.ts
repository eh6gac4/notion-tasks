import { useEffect } from 'react';
import type { Email } from '@/types/mail';

export interface UseMailShortcutsOptions {
  emails: Email[];
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  onOpenCompose: () => void;
  enabled?: boolean;
}

export function isEditingInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;

  const tagName = target.tagName.toUpperCase();
  if (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    tagName === 'OPTION' ||
    tagName === 'OPTGROUP'
  ) {
    return true;
  }

  if (target.closest('input, textarea, select, option, optgroup')) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  if (target.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')) {
    return true;
  }

  return false;
}

export function useMailShortcuts({
  emails,
  selectedId,
  onSelectEmail,
  onOpenCompose,
  enabled = true,
}: UseMailShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Ignore if modifier keys are active
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // 2. Ignore if focus is in an editable input context
      if (isEditingInput(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      // 3. 'c' key -> trigger compose callback
      if (key === 'c') {
        event.preventDefault();
        onOpenCompose();
        return;
      }

      // 4. 'j' key -> navigate to next email in list
      if (key === 'j') {
        event.preventDefault();
        if (emails.length === 0) return;

        const currentIndex = emails.findIndex((e) => e.id === selectedId);
        if (currentIndex === -1) {
          onSelectEmail(emails[0].id);
        } else if (currentIndex < emails.length - 1) {
          onSelectEmail(emails[currentIndex + 1].id);
        }
        return;
      }

      // 5. 'k' key -> navigate to previous email in list
      if (key === 'k') {
        event.preventDefault();
        if (emails.length === 0) return;

        const currentIndex = emails.findIndex((e) => e.id === selectedId);
        if (currentIndex === -1) {
          onSelectEmail(emails[0].id);
        } else if (currentIndex > 0) {
          onSelectEmail(emails[currentIndex - 1].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedId, onSelectEmail, onOpenCompose, enabled]);
}
