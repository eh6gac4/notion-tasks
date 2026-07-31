'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MailFolder, Email, ComposeDraft } from '@/types/mail';
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from '@/lib/mockMailData';
import { useMailShortcuts } from '@/hooks/useMailShortcuts';
import { MailSidebar } from '@/components/mail/MailSidebar';
import { MailList } from '@/components/mail/MailList';
import { MailDetail } from '@/components/mail/MailDetail';
import { MailComposeModal } from '@/components/mail/MailComposeModal';
import { TaskifyModal } from '@/components/mail/TaskifyModal';
import { AIDraftModal } from '@/components/mail/AIDraftModal';
import { MailToast } from '@/components/mail/MailToast';

const generateMailId = (): string => `mail-${Date.now()}`;

export default function MailPage() {
  const [emails, setEmails] = useState<Email[]>(INITIAL_MOCK_EMAILS);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeInitialDraft, setComposeInitialDraft] = useState<Partial<ComposeDraft> | undefined>(undefined);
  const [taskifyEmail, setTaskifyEmail] = useState<Email | null>(null);
  const [aiDraftEmail, setAiDraftEmail] = useState<Email | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');

  // Compute folder filtered emails
  const currentFolderEmails = useMemo(() => {
    return getFilteredEmails(emails, activeFolder);
  }, [emails, activeFolder]);

  // Compute search & folder filtered emails
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return currentFolderEmails;
    const q = searchQuery.toLowerCase();
    return currentFolderEmails.filter(
      (email) =>
        email.subject.toLowerCase().includes(q) ||
        email.sender.name.toLowerCase().includes(q) ||
        email.sender.email.toLowerCase().includes(q) ||
        email.body.toLowerCase().includes(q)
    );
  }, [currentFolderEmails, searchQuery]);

  // Selected email state (default to first email in current folder)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initialFolderEmails = getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox');
    return initialFolderEmails.length > 0 ? initialFolderEmails[0].id : null;
  });

  // Calculate unread counts per folder
  const unreadCounts = useMemo(() => {
    const counts: Record<MailFolder, number> = {
      inbox: 0,
      starred: 0,
      sent: 0,
      archive: 0,
      trash: 0,
    };
    emails.forEach((email) => {
      if (!email.isRead && email.folder !== 'trash') {
        counts[email.folder] = (counts[email.folder] || 0) + 1;
      }
    });
    return counts;
  }, [emails]);

  // Handle folder switching
  const handleSelectFolder = (folder: MailFolder) => {
    setActiveFolder(folder);
    const folderEmails = getFilteredEmails(emails, folder);
    setSelectedId(folderEmails.length > 0 ? folderEmails[0].id : null);
  };

  // Handle email selection & mark as read
  const handleSelectEmail = (id: string) => {
    setSelectedId(id);
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, isRead: true } : email))
    );
  };

  // Handle star toggle
  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails((prevEmails) => {
      const nextEmails = prevEmails.map((email) =>
        email.id === id ? { ...email, isStarred: !email.isStarred } : email
      );

      if (activeFolder === 'starred') {
        const remainingStarred = getFilteredEmails(nextEmails, 'starred');
        if (selectedId === id) {
          const oldIndex = currentFolderEmails.findIndex((e) => e.id === id);
          if (remainingStarred.length === 0) {
            setSelectedId(null);
          } else {
            const newIndex = Math.min(oldIndex, remainingStarred.length - 1);
            setSelectedId(remainingStarred[newIndex].id);
          }
        }
      }

      return nextEmails;
    });
  };

  // Handle compose modal trigger
  const handleOpenCompose = (initialDraft?: Partial<ComposeDraft>) => {
    setComposeInitialDraft(initialDraft);
    setIsComposeOpen(true);
  };

  // Handle sending email draft
  const handleSendDraft = (draft: ComposeDraft) => {
    const newEmail: Email = {
      id: generateMailId(),
      sender: { name: 'You', email: 'user@notion-tasks.local', avatar: 'ME' },
      recipients: [draft.to],
      subject: draft.subject,
      body: draft.body,
      date: new Date().toISOString(),
      folder: 'sent',
      isRead: true,
      isStarred: false,
    };
    setEmails((prev) => [newEmail, ...prev]);
    setIsComposeOpen(false);
    showToast('Email sent successfully!', 'success');
  };

  // Handle Taskify action trigger
  const handleTaskify = (email: Email) => {
    setTaskifyEmail(email);
  };

  const handleCreateTask = (taskData: { title: string; status: string; priority: string; tags: string[] }) => {
    setTaskifyEmail(null);
    showToast(`Task created in Notion: "${taskData.title}"`, 'success');
  };

  // Handle AI Draft action trigger
  const handleAIDraft = (email: Email) => {
    setAiDraftEmail(email);
  };

  const handleInsertAIDraft = (draftBody: string) => {
    const currentEmail = aiDraftEmail;
    setAiDraftEmail(null);
    handleOpenCompose({
      to: currentEmail?.sender.email || '',
      subject: currentEmail ? `Re: ${currentEmail.subject}` : 'AI Response',
      body: draftBody,
    });
    showToast('AI draft inserted into compose editor', 'info');
  };

  // Toast feedback helper
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Register global keyboard shortcuts hook ('j', 'k', 'c')
  useMailShortcuts({
    emails: filteredEmails,
    selectedId,
    onSelectEmail: handleSelectEmail,
    onOpenCompose: () => handleOpenCompose(),
    enabled: !isComposeOpen && !taskifyEmail && !aiDraftEmail,
  });

  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedId) || null;
  }, [emails, selectedId]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] select-none">
      {/* Top Bar Header */}
      <header className="h-12 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
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
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Tasks</span>
          </Link>
          <span className="text-[var(--border-strong)]">|</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-pixel font-bold text-[var(--accent)] tracking-wider">
              ✦ NOTION MAIL
            </span>
            <span className="text-[10px] px-2 py-1 bg-[var(--accent-soft)] text-[var(--accent)] font-pixel border border-[var(--border-accent)]">
              MOCK DEMO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-dim)]">
          <span>
            Folder: <strong className="text-[var(--text)] uppercase">{activeFolder}</strong>
          </span>
        </div>
      </header>

      {/* Main 3-Pane Body Layout */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pane 1: Sidebar */}
        <MailSidebar
          activeFolder={activeFolder}
          onSelectFolder={handleSelectFolder}
          unreadCounts={unreadCounts}
          onOpenCompose={() => handleOpenCompose()}
        />

        {/* Pane 2: Email List */}
        <MailList
          emails={filteredEmails}
          selectedId={selectedId}
          onSelectEmail={handleSelectEmail}
          onToggleStar={handleToggleStar}
          activeFolder={activeFolder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Pane 3: Email Detail */}
        <MailDetail
          email={selectedEmail}
          onTaskify={handleTaskify}
          onAIDraft={handleAIDraft}
        />
      </main>

      {/* Compose Modal */}
      <MailComposeModal
        isOpen={isComposeOpen}
        initialDraft={composeInitialDraft}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendDraft}
      />

      {/* Taskify Modal */}
      <TaskifyModal
        isOpen={!!taskifyEmail}
        email={taskifyEmail}
        onClose={() => setTaskifyEmail(null)}
        onCreateTask={handleCreateTask}
      />

      {/* AI Draft Modal */}
      <AIDraftModal
        isOpen={!!aiDraftEmail}
        email={aiDraftEmail}
        onClose={() => setAiDraftEmail(null)}
        onInsertDraft={handleInsertAIDraft}
      />

      {/* Toast Feedback Notification */}
      <MailToast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
