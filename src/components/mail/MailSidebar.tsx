'use client';

import React from 'react';
import { MailFolder } from '@/types/mail';

export interface MailSidebarProps {
  activeFolder: MailFolder;
  onSelectFolder: (folder: MailFolder) => void;
  unreadCounts: Record<MailFolder, number>;
  onOpenCompose: () => void;
  labels: string[];
  activeLabel: string | null;
  onSelectLabel: (label: string) => void;
}

const FOLDERS: { id: MailFolder; label: string; icon: React.ReactNode }[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'sent',
    label: 'Sent',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
];

export function MailSidebar({
  activeFolder,
  onSelectFolder,
  unreadCounts,
  onOpenCompose,
  labels,
  activeLabel,
  onSelectLabel,
}: MailSidebarProps) {
  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex-col p-4 space-y-4">
      {/* Compose Button */}
      <button
        onClick={onOpenCompose}
        type="button"
        className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-pixel font-semibold py-2 px-4 rounded-none flex items-center justify-center gap-2 transition-colors shadow-[2px_2px_0px_var(--accent-dark)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Compose</span>
        <span className="ml-auto text-xs opacity-75 font-mono px-1 border border-white/30 rounded-none">
          c
        </span>
      </button>

      {/* Navigation Folders */}
      <nav aria-label="Mail Folders" className="space-y-1">
        {FOLDERS.map((folder) => {
          const isActive = !activeLabel && activeFolder === folder.id;
          const unreadCount = unreadCounts[folder.id] || 0;

          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent)] font-semibold'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border-transparent'
              }`}
            >
              {folder.icon}
              <span className="truncate">{folder.label}</span>
              {unreadCount > 0 && (
                <span className="ml-auto text-xs px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)] font-pixel font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="pt-4 mt-4 border-t border-[var(--border)] overflow-y-auto min-h-0 flex-1">
          <h3 className="px-3 text-xs font-pixel text-[var(--text-faint)] mb-2 uppercase tracking-wider">
            Labels
          </h3>
          <nav aria-label="Mail Labels" className="space-y-1">
            {labels.map((label) => {
              const isActive = activeLabel === label;
              return (
                <button
                  key={label}
                  onClick={() => onSelectLabel(label)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                    isActive
                      ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent)] font-semibold'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border-transparent'
                  }`}
                >
                  <span className="w-4 flex justify-center">
                    <span className={`w-1.5 h-1.5 rounded-none ${isActive ? 'bg-[var(--accent)]' : 'border border-[var(--border-strong)]'}`}></span>
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
}
