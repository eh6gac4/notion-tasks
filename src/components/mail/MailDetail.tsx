'use client';

import React from 'react';
import { Email } from '@/types/mail';

export interface MailDetailProps {
  email: Email | null;
  onTaskify?: (email: Email) => void;
  onAIDraft?: (email: Email) => void;
  onBack?: () => void;
}

export function getSenderInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function MailDetail({ email, onTaskify, onAIDraft, onBack }: MailDetailProps) {
  if (!email) {
    return (
      <div className="hidden md:flex flex-1 bg-[var(--surface)] flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-none bg-[var(--surface-2)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-dim)] mb-4 shadow-[4px_4px_0px_var(--accent-dark)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h3 className="text-base font-pixel font-bold text-[var(--text)] mb-2">
          No Email Selected
        </h3>
        <p className="text-xs text-[var(--text-dim)] max-w-sm font-mono">
          Select an email from the list or use <kbd className="px-1 py-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] font-pixel text-xs">j</kbd> / <kbd className="px-1 py-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] font-pixel text-xs">k</kbd> keys to navigate.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(email.date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="flex-1 bg-[var(--surface)] flex flex-col min-h-0 overflow-y-auto w-full md:w-auto">
      {/* Top Detail Bar / Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border)] bg-[var(--bg)] space-y-4">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--accent)] mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to List
        </button>
        {/* Subject & Folder Badge */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-pixel font-bold text-[var(--text)] tracking-wide">
            {email.subject}
          </h2>
          <span className="px-2 py-1 bg-[var(--surface-2)] text-[var(--accent)] text-xs font-pixel uppercase tracking-wider border border-[var(--border-accent)] flex-shrink-0">
            {email.folder}
          </span>
        </div>

        {/* Labels */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {email.labels.map((label, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] font-pixel border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-dim)] uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_var(--border)]">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-none"></span>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Sender Info Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-dark)] text-white font-pixel font-bold flex items-center justify-center border border-[var(--border-strong)] text-sm shadow-[2px_2px_0px_var(--accent)]">
              {email.sender.avatar || getSenderInitials(email.sender.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text)]">
                  {email.sender.name}
                </span>
                <span className="text-xs text-[var(--text-dim)] font-mono">
                  &lt;{email.sender.email}&gt;
                </span>
              </div>
              <div className="text-xs text-[var(--text-faint)] font-mono mt-1">
                to {email.recipients.join(', ')}
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--text-dim)] font-mono flex-shrink-0">
            {formattedDate}
          </div>
        </div>

        {/* Action Buttons (Notion Taskify & AI Draft Stubs for M1/M3) */}
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => onTaskify?.(email)}
            className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-mono font-semibold border border-[var(--border-strong)] hover:border-[var(--accent)] transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="11" y2="17" />
            </svg>
            <span>Taskify to Notion</span>
          </button>

          <button
            type="button"
            onClick={() => onAIDraft?.(email)}
            className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-mono font-semibold border border-[var(--border-strong)] hover:border-[var(--accent)] transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>AI Draft Reply</span>
          </button>
        </div>
      </div>

      {/* Email Body */}
      <div className="p-6 text-sm text-[var(--text)] font-sans leading-relaxed whitespace-pre-wrap">
        {email.body}
      </div>
    </div>
  );
}
