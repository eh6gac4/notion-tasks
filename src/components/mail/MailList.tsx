'use client';

import React from 'react';
import { Email, MailFolder } from '@/types/mail';

export interface MailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  onToggleStar?: (id: string, e: React.MouseEvent) => void;
  activeFolder?: MailFolder;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function MailList({
  emails,
  selectedId,
  onSelectEmail,
  onToggleStar,
  searchQuery = '',
  onSearchChange,
}: MailListProps) {
  const filteredEmails = emails.filter((email) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(q) ||
      email.sender.name.toLowerCase().includes(q) ||
      email.sender.email.toLowerCase().includes(q) ||
      email.body.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`w-full md:w-80 flex-shrink-0 bg-[var(--bg)] border-r border-[var(--border)] flex-col min-h-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)] space-y-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search mail..."
            className="w-full bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-faint)] text-xs px-3 py-2 border border-[var(--border-strong)] focus:outline-none focus:border-[var(--accent)] font-mono"
            aria-label="Search mail"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              type="button"
              className="absolute right-2 text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-mono"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-[10px] text-[var(--text-faint)] font-mono px-1 flex justify-between">
          <span>{filteredEmails.length} messages</span>
          <span className="text-[var(--accent)] font-pixel">j / k to navigate</span>
        </div>
      </div>

      {/* Email List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]" role="listbox" aria-label="Email list">
        {filteredEmails.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-dim)] font-mono">
            {searchQuery ? 'No emails match your search.' : 'No emails in this folder.'}
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = email.id === selectedId;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`p-3 cursor-pointer transition-colors relative border-l-4 ${
                  isSelected
                    ? 'bg-[var(--surface-2)] border-[var(--accent)]'
                    : 'bg-[var(--bg)] hover:bg-[var(--surface)] border-transparent'
                }`}
                role="option"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectEmail(email.id);
                  }
                }}
                aria-selected={isSelected ? 'true' : 'false'}
              >
                {/* Top Row: Unread Dot + Sender + Date */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    {!email.isRead && (
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0"
                        title="Unread"
                        aria-label="Unread message"
                      />
                    )}
                    <span
                      className={`truncate ${
                        email.isRead
                          ? 'text-[var(--text-dim)] font-normal'
                          : 'text-[var(--text)] font-bold'
                      }`}
                    >
                      {email.sender.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-faint)] font-mono flex-shrink-0">
                    {formatDate(email.date)}
                  </span>
                </div>

                {/* Subject */}
                <div
                  className={`text-xs mt-1 truncate ${
                    email.isRead ? 'text-[var(--text-dim)]' : 'text-[var(--text)] font-semibold'
                  }`}
                >
                  {email.subject}
                </div>

                {/* Labels */}
                {email.labels && email.labels.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {email.labels.map((label, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[9px] font-pixel border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-dim)] uppercase tracking-wider">
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Body Snippet + Star Button */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-[11px] text-[var(--text-faint)] truncate flex-1">
                    {email.body.replace(/[#*`]/g, '').slice(0, 80)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar?.(email.id, e);
                    }}
                    className={`p-1 hover:text-[var(--accent)] transition-colors flex-shrink-0 ${
                      email.isStarred ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'
                    }`}
                    aria-label={email.isStarred ? 'Unstar email' : 'Star email'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={email.isStarred ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
