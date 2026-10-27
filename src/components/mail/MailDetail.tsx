'use client';

import React from 'react';
import { Email } from '@/types/mail';
import { MailBody } from '@/components/mail/MailBody';
import { useSwipeBack } from '@/hooks/useSwipeBack';

export interface MailDetailProps {
  email: Email | null;
  isBodyLoading?: boolean;
  onAIDraft?: (email: Email) => void;
  onToggleArchive?: (id: string) => void;
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

export function MailDetail({ email, isBodyLoading, onAIDraft, onToggleArchive, onBack }: MailDetailProps) {
  // 左端からのスワイプで一覧へ戻る（standalone PWA では OS のエッジスワイプバックが効かないため）
  const panelRef = useSwipeBack<HTMLDivElement>({ onBack: () => onBack?.(), disabled: !email || !onBack });

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
        <p className="text-xs text-[var(--text-dim)] max-w-sm font-pixel">
          Select an email from the list or use <kbd className="px-1 py-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] font-pixel text-xs">j</kbd> / <kbd className="px-1 py-1 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] font-pixel text-xs">k</kbd> keys to navigate.
        </p>
      </div>
    );
  }

  const isArchived = email.folder === 'archive';

  const formattedDate = new Date(email.date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      ref={panelRef}
      className="flex-1 bg-[var(--surface)] flex flex-col min-w-0 min-h-0 overflow-y-auto w-full md:w-auto pb-[var(--safe-bottom)] select-text"
    >
      {/* Top Detail Bar / Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border)] bg-[var(--bg)] space-y-4">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-2 text-xs font-pixel text-[var(--text-dim)] hover:text-[var(--accent)] mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to List
        </button>
        {/* Subject & Folder Badge */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 wrap-anywhere text-lg font-pixel font-bold text-[var(--text)] tracking-wide">
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
        <div className="flex flex-col items-start md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 max-w-full">
            <div className="w-10 h-10 shrink-0 bg-[var(--accent-dark)] text-white font-pixel font-bold flex items-center justify-center border border-[var(--border-strong)] text-sm shadow-[2px_2px_0px_var(--accent)]">
              {email.sender.avatar || getSenderInitials(email.sender.name)}
            </div>
            <div className="min-w-0 wrap-anywhere">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-bold text-[var(--text)]">
                  {email.sender.name}
                </span>
                <span className="text-xs text-[var(--text-dim)] font-pixel">
                  &lt;{email.sender.email}&gt;
                </span>
              </div>
              <div className="text-xs text-[var(--text-faint)] font-pixel mt-1">
                to {email.recipients.join(', ')}
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--text-dim)] font-pixel flex-shrink-0">
            {formattedDate}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-3 pt-2 border-t border-[var(--border)]">

          <button
            type="button"
            onClick={() => onAIDraft?.(email)}
            className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-pixel font-semibold border border-[var(--border-strong)] hover:border-[var(--accent)] transition-colors flex items-center gap-2"
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

          <button
            type="button"
            onClick={() => onToggleArchive?.(email.id)}
            className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-pixel font-semibold border border-[var(--border-strong)] hover:border-[var(--accent)] transition-colors flex items-center gap-2"
            aria-label={isArchived ? 'Unarchive email' : 'Archive email'}
          >
            {isArchived ? (
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
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            ) : (
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
                <rect x="2" y="4" width="20" height="5" />
                <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                <line x1="10" y1="13" x2="14" y2="13" />
              </svg>
            )}
            <span>{isArchived ? 'Unarchive' : 'Archive'}</span>
          </button>
        </div>
      </div>

      {/* Email Body */}
      {!isBodyLoading && !!email.attachments?.length && (
        <section aria-label="添付ファイル" className="p-4 md:px-6 border-b border-[var(--border)]">
          <h3 className="text-xs text-[var(--text-dim)] mb-2">添付ファイル ({email.attachments.length})</h3>
          <ul className="flex flex-wrap gap-2">
            {email.attachments.map((attachment) => (
              <li key={attachment.id} className="min-w-0 max-w-full">
                <a
                  href={`/api/mail/${encodeURIComponent(email.id)}/attachments/${encodeURIComponent(attachment.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--accent)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="min-w-0 wrap-anywhere">{attachment.filename}</span>
                  <span className="shrink-0 text-xs text-[var(--text-dim)]">
                    {attachment.size < 1024 ? `${attachment.size} B` : attachment.size < 1024 * 1024 ? `${Math.ceil(attachment.size / 1024)} KB` : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="relative">
        <MailBody body={email.body} bodyHtml={email.bodyHtml} isLoading={isBodyLoading} />
        {/* sandbox iframe 内のタッチは親に届かないため、左端を戻る操作用に確保する。 */}
        {email.bodyHtml && onBack && (
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-6 md:hidden" />
        )}
      </div>
    </div>
  );
}
