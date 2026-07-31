'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ComposeDraft } from '@/types/mail';
import { SlashCommandMenu, SlashCommandOption } from './SlashCommandMenu';
import { MarkdownPreview } from '../MarkdownPreview';

export interface MailComposeModalProps {
  isOpen: boolean;
  initialDraft?: Partial<ComposeDraft>;
  onClose: () => void;
  onSend: (draft: ComposeDraft) => void;
}

export function MailComposeModal({
  isOpen,
  initialDraft,
  onClose,
  onSend,
}: MailComposeModalProps) {
  const [to, setTo] = useState<string>(initialDraft?.to || '');
  const [subject, setSubject] = useState<string>(initialDraft?.subject || '');
  const [body, setBody] = useState<string>(initialDraft?.body || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSlashOpen, setIsSlashOpen] = useState<boolean>(false);
  const [slashFilter, setSlashFilter] = useState<string>('');
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
  const [prevInitialDraft, setPrevInitialDraft] = useState<Partial<ComposeDraft> | undefined>(undefined);

  const slashPos = { top: 180, left: 32 };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (isOpen !== prevIsOpen || initialDraft !== prevInitialDraft) {
    setPrevIsOpen(isOpen);
    setPrevInitialDraft(initialDraft);
    if (isOpen) {
      setTo(initialDraft?.to || '');
      setSubject(initialDraft?.subject || '');
      setBody(initialDraft?.body || '');
      setActiveTab('edit');
      setIsSlashOpen(false);
    }
  }

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSlashOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSlashOpen, onClose]);

  if (!isOpen) return null;

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    // Detect slash command trigger at beginning of text or line
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastLine = textBeforeCursor.split('\n').pop() || '';

    if (lastLine.startsWith('/')) {
      setSlashFilter(lastLine);
      setIsSlashOpen(true);
    } else {
      setIsSlashOpen(false);
    }
  };

  const handleSelectSlashOption = (option: SlashCommandOption) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || body.length;
    const textBeforeCursor = body.slice(0, cursorPos);
    const lastLineIndex = textBeforeCursor.lastIndexOf('\n');
    const textBeforeLine = lastLineIndex >= 0 ? body.slice(0, lastLineIndex + 1) : '';
    const textAfterCursor = body.slice(cursorPos);

    const newBody = textBeforeLine + option.insertText + textAfterCursor;
    setBody(newBody);
    setIsSlashOpen(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!to.trim() || !subject.trim()) {
      return;
    }
    onSend({ to, subject, body });
  };

  return (
    <div
      data-testid="compose-modal"
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Compose Email"
    >
      <div className="bg-[var(--surface)] border-2 border-[var(--accent)] w-full max-w-xl p-6 space-y-4 shadow-[8px_8px_0px_var(--accent-dark)] relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-pixel font-bold text-[var(--accent)]">
              New Message (Notion Compose)
            </h3>
            {/* Tab Controls */}
            <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 border border-[var(--border-strong)]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-[var(--accent)] text-white font-bold'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[var(--accent)] text-white font-bold'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close compose modal"
            className="text-[var(--text-dim)] hover:text-[var(--text)] font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs flex-1 flex flex-col min-h-0">
          <div>
            <label className="block text-[var(--text-dim)] mb-1">To:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              data-testid="compose-to-input"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          <div>
            <label className="block text-[var(--text-dim)] mb-1">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              data-testid="compose-subject-input"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[var(--text-dim)]">Body (Markdown):</label>
              <span className="text-[10px] text-[var(--accent)] font-pixel">Type / for commands</span>
            </div>

            {activeTab === 'edit' ? (
              <textarea
                ref={textareaRef}
                rows={6}
                value={body}
                onChange={handleBodyChange}
                placeholder="Write your email body here... (Type '/' for Notion slash commands)"
                data-testid="compose-body-textarea"
                className="w-full flex-1 bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono leading-relaxed"
              />
            ) : (
              <div
                data-testid="compose-markdown-preview"
                className="w-full flex-1 bg-[var(--bg)] border border-[var(--border-strong)] p-3 overflow-y-auto"
              >
                <MarkdownPreview content={body || '*No content*'} />
              </div>
            )}

            {/* Integrated Slash Command Menu Popup */}
            {activeTab === 'edit' && (
              <SlashCommandMenu
                isOpen={isSlashOpen}
                filterText={slashFilter}
                position={slashPos}
                onSelectOption={handleSelectSlashOption}
                onClose={() => setIsSlashOpen(false)}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] font-pixel text-xs border border-[var(--border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="compose-send-button"
              disabled={!to.trim() || !subject.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] font-pixel text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              送信 (Send)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
