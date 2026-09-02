'use client';

import React, { useEffect } from 'react';

export interface MailToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'error';
  duration?: number;
  onClose: () => void;
}

export function MailToast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: MailToastProps) {
  useEffect(() => {
    if (!message || duration <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--surface-2)]',
    info: 'border-[var(--accent)] text-[var(--text)] bg-[var(--surface-2)]',
    error: 'border-red-500 text-red-400 bg-[var(--surface-2)]',
  };

  const typeIcons = {
    success: '✓',
    info: 'ℹ',
    error: '⚠',
  };

  return (
    <div
      data-testid="mail-toast"
      className={`fixed bottom-[calc(16px+var(--safe-bottom))] right-[calc(16px+var(--safe-right))] z-50 border-2 px-4 py-3 font-mono text-xs shadow-[4px_4px_0px_var(--accent-dark)] transition-all flex items-center gap-3 ${
        typeStyles[type] || typeStyles.info
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="font-pixel font-bold text-sm">{typeIcons[type] || 'ℹ'}</span>
      <span className="flex-1 font-mono">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-[var(--text-dim)] hover:text-[var(--text)] font-mono ml-2"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
