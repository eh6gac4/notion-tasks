'use client';

import React, { useState, useEffect } from 'react';
import { Email } from '@/types/mail';

export interface TaskifyModalProps {
  isOpen: boolean;
  email: Email | null;
  onClose: () => void;
  onCreateTask: (taskData: {
    title: string;
    status: string;
    priority: string;
    tags: string[];
    description?: string;
  }) => void;
}

export function TaskifyModal({
  isOpen,
  email,
  onClose,
  onCreateTask,
}: TaskifyModalProps) {
  const [title, setTitle] = useState<string>('');
  const [status, setStatus] = useState<string>('To Do');
  const [priority, setPriority] = useState<string>('Medium');
  const [tagInput, setTagInput] = useState<string>('Email, Task');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
  const [prevEmail, setPrevEmail] = useState<Email | null>(null);

  if (isOpen !== prevIsOpen || email !== prevEmail) {
    setPrevIsOpen(isOpen);
    setPrevEmail(email);
    if (isOpen) {
      if (email) {
        setTitle(email.subject?.trim() || 'Task from email');
        setDescription(
          `Converted from Email (${email.id}):\nFrom: ${email.sender.name} <${email.sender.email}>\nDate: ${email.date}\n\n${email.body}`
        );
      } else {
        setTitle('Task from email');
        setDescription('');
      }
      setStatus('To Do');
      setPriority('Medium');
      setTagInput('Email, Task');
      setIsSubmitting(false);
    }
  }

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !email) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || 'Task from email';
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    onCreateTask({
      title: cleanTitle,
      status,
      priority,
      tags,
      description,
    });
    setIsSubmitting(false);
  };

  return (
    <div
      data-testid="taskify-modal"
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Convert Email to Notion Task"
    >
      <div className="bg-[var(--surface)] border-2 border-[var(--accent)] w-full max-w-md p-6 space-y-4 shadow-[8px_8px_0px_var(--accent-dark)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-[var(--accent)] text-white font-pixel font-bold flex items-center justify-center text-xs">
              ☑
            </span>
            <h3 className="text-base font-pixel font-bold text-[var(--accent)]">
              Convert to Notion Task
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close taskify modal"
            className="text-[var(--text-dim)] hover:text-[var(--text)] font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Task Form */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-[var(--text-dim)] mb-1">Task Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="taskify-title-input"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-dim)] mb-1">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                data-testid="taskify-status-select"
                className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-dim)] mb-1">Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="taskify-priority-select"
                className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-dim)] mb-1">Tags (comma-separated):</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              data-testid="taskify-tags-input"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[var(--text-dim)] mb-1">Description Link:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="taskify-description-textarea"
              className="w-full bg-[var(--bg)] border border-[var(--border-strong)] p-2 text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
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
              data-testid="taskify-submit-button"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] font-pixel text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Notion Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
