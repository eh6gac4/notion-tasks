'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface SlashCommandOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
  insertText: string;
  action: string;
}

export interface SlashCommandMenuProps {
  isOpen: boolean;
  filterText: string;
  position?: { top: number; left: number };
  onSelectOption: (option: SlashCommandOption) => void;
  onClose: () => void;
}

export const DEFAULT_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    id: 'task',
    label: '/task (Notion Task)',
    description: 'Convert selection or line to Notion task item',
    icon: '☑',
    insertText: '[ ] ',
    action: 'task',
  },
  {
    id: 'ai',
    label: '/ai (AI Draft)',
    description: 'Generate AI email draft response',
    icon: '✨',
    insertText: '/ai ',
    action: 'ai',
  },
  {
    id: 'h1',
    label: '/h1 (Heading 1)',
    description: 'Insert large section header',
    icon: 'H1',
    insertText: '# ',
    action: 'h1',
  },
  {
    id: 'h2',
    label: '/h2 (Heading 2)',
    description: 'Insert sub-heading section header',
    icon: 'H2',
    insertText: '## ',
    action: 'h2',
  },
  {
    id: 'bold',
    label: '/bold (Bold Text)',
    description: 'Format text as bold',
    icon: 'B',
    insertText: '**bold text**',
    action: 'bold',
  },
  {
    id: 'list',
    label: '/list (Bullet List)',
    description: 'Create a bulleted list item',
    icon: '•',
    insertText: '- ',
    action: 'list',
  },
  {
    id: 'code',
    label: '/code (Code Block)',
    description: 'Insert markdown code block',
    icon: '</>',
    insertText: '```\n\n```',
    action: 'code',
  },
];

export function SlashCommandMenu({
  isOpen,
  filterText,
  position = { top: 100, left: 20 },
  onSelectOption,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands by filterText with multi-field search and alias support
  const filteredOptions = DEFAULT_SLASH_COMMANDS.filter((opt) => {
    if (!filterText) return true;
    const cleanFilter = filterText.startsWith('/')
      ? filterText.slice(1).toLowerCase()
      : filterText.toLowerCase();

    if (cleanFilter === 'bullet' && opt.id === 'list') return true;
    if (cleanFilter === 'heading' && (opt.id === 'h1' || opt.id === 'h2')) return true;

    return (
      opt.id.toLowerCase().includes(cleanFilter) ||
      opt.label.toLowerCase().includes(cleanFilter) ||
      opt.description.toLowerCase().includes(cleanFilter) ||
      opt.action.toLowerCase().includes(cleanFilter)
    );
  });

  // Clamp selectedIndex within filtered range without useEffect state loop
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(0, filteredOptions.length - 1));

  // Keyboard navigation inside popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (filteredOptions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions[safeSelectedIndex]) {
          onSelectOption(filteredOptions[safeSelectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredOptions, safeSelectedIndex, onSelectOption, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      data-testid="slash-command-menu"
      className="absolute z-50 w-72 bg-[var(--surface)] border-2 border-[var(--accent)] shadow-[4px_4px_0px_var(--accent-dark)] overflow-hidden font-mono text-xs"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="listbox"
      aria-label="Slash Commands"
    >
      <div className="px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)] text-[10px] text-[var(--accent)] font-pixel font-bold tracking-wider uppercase flex justify-between items-center">
        <span>Notion Commands</span>
        {filterText && <span className="text-[var(--text-faint)]">&quot;{filterText}&quot;</span>}
      </div>

      <div className="max-h-56 overflow-y-auto py-1">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-center text-[var(--text-dim)] font-mono text-xs">
            No commands matching &quot;{filterText}&quot;
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = idx === safeSelectedIndex;
            return (
              <div
                key={opt.id}
                data-testid={`slash-option-${opt.id}`}
                onClick={() => onSelectOption(opt)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold border-l-2 border-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--surface-2)] border-l-2 border-transparent'
                }`}
                role="option"
                aria-selected={isSelected ? 'true' : 'false'}
                tabIndex={isSelected ? 0 : -1}
              >
                <span className="w-5 h-5 flex items-center justify-center bg-[var(--bg)] border border-[var(--border-strong)] text-[10px] font-pixel text-[var(--accent)]">
                  {opt.icon || '/'}
                </span>
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs text-[var(--text)] truncate">
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)] truncate font-normal">
                    {opt.description}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

