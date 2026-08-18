'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { MailFolder, Email, ComposeDraft, MailPage } from '@/types/mail';
import { getFilteredEmails } from '@/lib/mockMailData';
import { useMailShortcuts } from '@/hooks/useMailShortcuts';
import { fetchMailsAction, markAsReadAction, toggleStarAction } from '@/app/mail/actions';
import { MailSidebar } from '@/components/mail/MailSidebar';
import { MailList } from '@/components/mail/MailList';
import { MailDetail } from '@/components/mail/MailDetail';
import { MailComposeModal } from '@/components/mail/MailComposeModal';
import { TaskifyModal } from '@/components/mail/TaskifyModal';
import { AIDraftModal } from '@/components/mail/AIDraftModal';
import { MailToast } from '@/components/mail/MailToast';

const generateMailId = (): string => `mail-${Date.now()}`;

// 送信モック(対象外機能)で生成したローカル限定メールかどうかの判定。
// Gmail 上に実在しないため、サーバーへの既読化・スター操作を送らない。
const isLocalOnlyEmail = (id: string): boolean => id.startsWith('mail-');

export interface MailManagerProps {
  initialEmails: Email[];
  initialNextPageToken?: string;
  initialLabels: string[];
  initialUnreadCounts: Record<MailFolder, number>;
}

export function MailManager({ initialEmails, initialNextPageToken, initialLabels, initialUnreadCounts }: MailManagerProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  // 送信モック(対象外機能)で生成したメールは Gmail 上に存在しないため、フォルダ切替時の
  // サーバー再フェッチでは戻ってこない。別 state で保持し、フォルダ一致時に合成する。
  const [localOnlyEmails, setLocalOnlyEmails] = useState<Email[]>([]);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [allLabels] = useState<string[]>(initialLabels);
  const [unreadCounts, setUnreadCounts] = useState<Record<MailFolder, number>>(initialUnreadCounts);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeInitialDraft, setComposeInitialDraft] = useState<Partial<ComposeDraft> | undefined>(undefined);
  const [taskifyEmail, setTaskifyEmail] = useState<Email | null>(null);
  const [aiDraftEmail, setAiDraftEmail] = useState<Email | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');
  const [isMailLoading, startMailTransition] = useTransition();
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(initialNextPageToken);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  // Compute search filtered emails (folder/label のフィルタは fetchMailsAction 側で完了済み)
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter(
      (email) =>
        email.subject.toLowerCase().includes(q) ||
        email.sender.name.toLowerCase().includes(q) ||
        email.sender.email.toLowerCase().includes(q) ||
        email.body.toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);

  // Selected email state (default to null for mobile responsive view)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // メール一覧の取得結果を state に反映する共通処理。mergeEmails で
  // 「置き換え(フォルダ/ラベル切替)」「先頭に合成(ローカル限定メール)」
  // 「末尾に追加(もっと読み込む)」の違いだけを呼び出し側に委ねる。
  const applyMailPage = (page: MailPage, mergeEmails: (prev: Email[], fetched: Email[]) => Email[]) => {
    setEmails((prev) => mergeEmails(prev, page.emails));
    setNextPageToken(page.nextPageToken);
  };

  // Handle folder switching — サーバーから該当フォルダのメールを取得する。
  // ローカル限定メール(送信モック)のうち対象フォルダに属するものは先頭に合成する。
  const handleSelectFolder = (folder: MailFolder) => {
    setActiveFolder(folder);
    setActiveLabel(null);
    setSelectedId(null);
    startMailTransition(async () => {
      const page = await fetchMailsAction(folder);
      const localForFolder = localOnlyEmails.filter((email) => email.folder === folder);
      applyMailPage(page, (_prev, fetched) => [...localForFolder, ...fetched]);
    });
  };

  // Handle label switching — サーバーから該当ラベルのメールを取得する
  const handleSelectLabel = (label: string) => {
    setActiveLabel(label);
    setSelectedId(null);
    startMailTransition(async () => {
      applyMailPage(await fetchMailsAction(activeFolder, label), (_prev, fetched) => fetched);
    });
  };

  // Handle "load more" — 現在のフォルダ/ラベルの続きを取得して末尾に追加する
  const handleLoadMore = () => {
    if (!nextPageToken) return;
    startLoadMoreTransition(async () => {
      const page = await fetchMailsAction(activeFolder, activeLabel ?? undefined, nextPageToken);
      applyMailPage(page, (prev, fetched) => [...prev, ...fetched]);
    });
  };

  // Handle email selection & mark as read
  const handleSelectEmail = (id: string) => {
    setSelectedId(id);
    const target = emails.find((email) => email.id === id);
    const wasUnread = !!target && !target.isRead;
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, isRead: true } : email))
    );
    if (isLocalOnlyEmail(id)) {
      setLocalOnlyEmails((prev) =>
        prev.map((email) => (email.id === id ? { ...email, isRead: true } : email))
      );
      return;
    }
    if (wasUnread) {
      startMailTransition(async () => {
        await markAsReadAction(id);
        setUnreadCounts((prev) => ({ ...prev, [target!.folder]: Math.max(0, prev[target!.folder] - 1) }));
      });
    }
  };

  // Handle star toggle
  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const toggleStarred = (list: Email[]) =>
      list.map((email) => (email.id === id ? { ...email, isStarred: !email.isStarred } : email));

    setEmails((prevEmails) => {
      const oldIndex = prevEmails.findIndex((email) => email.id === id);
      const toggledEmails = toggleStarred(prevEmails);
      // starred フォルダを表示中の場合、emails はサーバーから取得した固定リストなので
      // (旧実装のような都度フィルタが無い)、unstar したメールは明示的にリストから除く。
      const nextEmails = activeFolder === 'starred' ? getFilteredEmails(toggledEmails, 'starred') : toggledEmails;

      if (activeFolder === 'starred' && selectedId === id) {
        if (nextEmails.length === 0) {
          setSelectedId(null);
        } else {
          const newIndex = Math.min(oldIndex, nextEmails.length - 1);
          setSelectedId(nextEmails[newIndex].id);
        }
      }

      return nextEmails;
    });

    if (isLocalOnlyEmail(id)) {
      setLocalOnlyEmails(toggleStarred);
      return;
    }

    const current = emails.find((email) => email.id === id);
    const nextStarred = current ? !current.isStarred : false;
    startMailTransition(async () => {
      await toggleStarAction(id, nextStarred);
    });
  };

  // Handle compose modal trigger
  const handleOpenCompose = (initialDraft?: Partial<ComposeDraft>) => {
    setComposeInitialDraft(initialDraft);
    setIsComposeOpen(true);
  };

  // Handle sending email draft (モック: 対象外機能。実際には Gmail 送信は行わない)
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
    setLocalOnlyEmails((prev) => [newEmail, ...prev]);
    if (activeFolder === 'sent' && !activeLabel) {
      setEmails((prev) => [newEmail, ...prev]);
    }
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
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-dim)]">
          <span className="hidden md:inline">
            {activeLabel ? (
              <>Label: <strong className="text-[var(--text)] uppercase">{activeLabel}</strong></>
            ) : (
              <>Folder: <strong className="text-[var(--text)] uppercase">{activeFolder}</strong></>
            )}
          </span>
          <select
            className="md:hidden bg-[var(--bg)] border border-[var(--border-strong)] text-[var(--text)] uppercase px-2 py-1 focus:outline-none focus:border-[var(--accent)] max-w-[120px]"
            value={activeLabel ? `label:${activeLabel}` : `folder:${activeFolder}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('folder:')) {
                handleSelectFolder(val.replace('folder:', '') as MailFolder);
              } else if (val.startsWith('label:')) {
                handleSelectLabel(val.replace('label:', ''));
              }
            }}
          >
            <optgroup label="Folders">
              <option value="folder:inbox">INBOX</option>
              <option value="folder:starred">STARRED</option>
              <option value="folder:sent">SENT</option>
              <option value="folder:archive">ARCHIVE</option>
              <option value="folder:trash">TRASH</option>
            </optgroup>
            {allLabels.length > 0 && (
              <optgroup label="Labels">
                {allLabels.map((l) => (
                  <option key={l} value={`label:${l}`}>{l}</option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => handleOpenCompose()}
            className="md:hidden flex items-center justify-center w-8 h-8 bg-[var(--accent)] text-white shadow-[2px_2px_0px_var(--accent-dark)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
        </div>
      </header>

      {/* Main 3-Pane Body Layout */}
      <main className={`flex flex-1 min-h-0 overflow-hidden relative transition-opacity ${isMailLoading ? 'opacity-60' : ''}`}>
        {/* Pane 1: Sidebar */}
        <MailSidebar
          activeFolder={activeFolder}
          onSelectFolder={handleSelectFolder}
          unreadCounts={unreadCounts}
          onOpenCompose={() => handleOpenCompose()}
          labels={allLabels}
          activeLabel={activeLabel}
          onSelectLabel={handleSelectLabel}
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
          hasMore={!!nextPageToken}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />

        {/* Pane 3: Email Detail */}
        <MailDetail
          email={selectedEmail}
          onTaskify={handleTaskify}
          onAIDraft={handleAIDraft}
          onBack={() => setSelectedId(null)}
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
