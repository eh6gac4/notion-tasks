'use client';

import React, { useState, useEffect } from 'react';
import { Email } from '@/types/mail';
import { CyberLoader } from '../CyberLoader';

export interface AIDraftModalProps {
  isOpen: boolean;
  email: Email | null;
  onClose: () => void;
  onInsertDraft: (draftBody: string) => void;
}

export const PRESET_PROMPTS = [
  { label: '丁寧な返信', prompt: '丁寧なビジネス敬語で承諾の返信を作成してください。' },
  { label: '詳細を質問', prompt: '内容に関する質問および詳細の確認事項を箇条書きで返信してください。' },
  { label: '日程の調整', prompt: '来週の候補日時を3つ提示して日程調整のメールを作成してください。' },
];

export function AIDraftModal({
  isOpen,
  email,
  onClose,
  onInsertDraft,
}: AIDraftModalProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPrompt('');
      setIsGenerating(false);
      setGeneratedDraft(null);
      setErrorMessage(null);
    }
  }

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    // Simulate AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
      const subject = email ? email.subject : 'Reply';
      const senderName = email ? email.sender.name : 'there';
      const generated = `Hi ${senderName},\n\nThank you for your email regarding "${subject}".\n\n${prompt}\n\nLooking forward to working together.\n\nBest regards,\nNotion AI Assistant`;
      setGeneratedDraft(generated);
    }, 600);
  };

  const handleInsert = () => {
    if (generatedDraft) {
      onInsertDraft(generatedDraft);
    }
  };

  return (
    <div
      data-testid="ai-draft-modal"
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="AI Email Draft Generator"
    >
      <div className="bg-[var(--surface)] border-2 border-[var(--accent)] w-full max-w-lg p-6 space-y-4 shadow-[8px_8px_0px_var(--accent-dark)] relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-[var(--accent)] text-white font-pixel font-bold flex items-center justify-center text-xs">
              ✨
            </span>
            <h3 className="text-base font-pixel font-bold text-[var(--accent)]">
              AI Draft Reply Generator
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI draft modal"
            className="text-[var(--text-dim)] hover:text-[var(--text)] font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        {isGenerating ? (
          <div data-testid="ai-draft-loading" className="py-8 flex flex-col items-center justify-center space-y-4">
            <CyberLoader size="md" />
            <p className="text-xs font-mono text-[var(--accent)] font-pixel tracking-wider animate-pulse">
              GENERATING AI DRAFT...
            </p>
          </div>
        ) : generatedDraft ? (
          /* Draft Preview Result */
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-[var(--accent)] font-pixel text-xs">
              <span>Generated Draft Preview:</span>
              <button
                type="button"
                onClick={() => setGeneratedDraft(null)}
                className="text-[var(--text-dim)] hover:text-[var(--text)] text-[10px] underline"
              >
                Edit Prompt
              </button>
            </div>
            <textarea
              rows={8}
              value={generatedDraft}
              onChange={(e) => setGeneratedDraft(e.target.value)}
              data-testid="ai-draft-result-textarea"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-3 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleGenerate}
                data-testid="ai-draft-regenerate-button"
                className="px-3 py-2 bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] font-pixel text-xs border border-[var(--border)]"
              >
                再生成 (Regenerate)
              </button>
              <button
                type="button"
                onClick={handleInsert}
                data-testid="ai-draft-insert-button"
                className="px-4 py-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] font-pixel text-xs font-bold"
              >
                エディタに挿入 (Insert Draft)
              </button>
            </div>
          </div>
        ) : (
          /* Prompt Form */
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[var(--text-dim)] mb-1">
                Prompt Instruction (How should AI respond?):
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Write a friendly acceptance message..."
                data-testid="ai-draft-prompt-textarea"
                className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[10px] text-[var(--text-faint)] mb-2 font-pixel">
                QUICK PRESETS:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(preset.prompt)}
                    data-testid={`preset-prompt-${idx}`}
                    className="px-2 py-1 bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] border border-[var(--border)] text-[11px] transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2 bg-red-950/40 border border-red-500 text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

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
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                data-testid="ai-draft-generate-button"
                className="px-4 py-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] font-pixel text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                生成 (Generate)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
