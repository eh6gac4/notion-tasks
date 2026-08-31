'use client';

import React, { useState, useMemo, useRef, useTransition } from 'react';
import Link from 'next/link';
import { MailFolder, Email, ComposeDraft, MailPage } from '@/types/mail';
import { getFilteredEmails } from '@/lib/mockMailData';
import { useMailShortcuts } from '@/hooks/useMailShortcuts';
import { fetchMailsAction, searchMailsAction, fetchMailBodyAction, markAsReadAction, toggleStarAction, toggleArchiveAction } from '@/app/mail/actions';
import { MailSidebar } from '@/components/mail/MailSidebar';
import { MailList } from '@/components/mail/MailList';
import { MailDetail } from '@/components/mail/MailDetail';
import { MailComposeModal } from '@/components/mail/MailComposeModal';
import { TaskifyModal } from '@/components/mail/TaskifyModal';
import { AIDraftModal } from '@/components/mail/AIDraftModal';
import { MailToast } from '@/components/mail/MailToast';

const generateMailId = (): string => `mail-${Date.now()}`;

// フォルダ/ラベル単位のキャッシュキー。ラベル表示はフォルダに依存しないため label 単独で持つ。
const mailCacheKey = (folder: MailFolder, label: string | null): string =>
  label ? `label:${label}` : `folder:${folder}`;

// 検索結果はフォルダを跨ぐため、フォルダ/ラベルのキャッシュ枠とは別の名前空間に置く。
const SEARCH_CACHE_PREFIX = 'search:';
const searchCacheKey = (query: string): string => `${SEARCH_CACHE_PREFIX}${query}`;

// 検索キーは打った語の数だけ増えるので、直近ぶんだけ残して古い順に捨てる。
// 捨てないと、全キーを走査する patchCachedEmail が既読・スター操作のたびに重くなる。
const SEARCH_CACHE_LIMIT = 5;

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
  // 入力中の文字列と、Enter で確定してサーバー検索に投げた文字列を分ける。
  // 確定前に一覧が動くと、打鍵の途中で「該当なし」が出てしまうため。
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeInitialDraft, setComposeInitialDraft] = useState<Partial<ComposeDraft> | undefined>(undefined);
  const [taskifyEmail, setTaskifyEmail] = useState<Email | null>(null);
  const [aiDraftEmail, setAiDraftEmail] = useState<Email | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');
  const [isMailLoading, startMailTransition] = useTransition();
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(initialNextPageToken);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  // 一度取得したフォルダ/ラベルの一覧を保持し、再訪時は即座に表示してから裏で再検証する
  // (stale-while-revalidate)。切替のたびに空リストへ落ちるのを防ぐのが目的。
  // useRef の引数は毎レンダー評価されるため、初期 Map は遅延生成する。
  const mailCacheRef = useRef<Map<string, MailPage> | null>(null);
  if (mailCacheRef.current === null) {
    mailCacheRef.current = new Map([
      [mailCacheKey('inbox', null), { emails: initialEmails, nextPageToken: initialNextPageToken }],
    ]);
  }
  const mailCache = mailCacheRef.current;

  // Selected email state (default to null for mobile responsive view)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 本文の遅延取得中のメール ID。一覧取得は snippet しか含まないため、詳細を開いたタイミングで
  // 本文(bodyHtml 含む)を取りに行く。
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);

  // メール一覧の取得結果を state に反映する共通処理。mergeEmails で
  // 「置き換え(フォルダ/ラベル切替)」「先頭に合成(ローカル限定メール)」
  // 「末尾に追加(もっと読み込む)」の違いだけを呼び出し側に委ねる。
  const applyMailPage = (page: MailPage, mergeEmails: (prev: Email[], fetched: Email[]) => Email[]) => {
    setEmails((prev) => mergeEmails(prev, page.emails));
    setNextPageToken(page.nextPageToken);
  };

  // キャッシュへの唯一の書き込み口。ついでに古い検索結果を捨てる。
  const setCachedPage = (key: string, page: MailPage) => {
    mailCache.set(key, page);
    const searchKeys = Array.from(mailCache.keys()).filter((k) => k.startsWith(SEARCH_CACHE_PREFIX));
    searchKeys.slice(0, -SEARCH_CACHE_LIMIT).forEach((k) => mailCache.delete(k));
  };

  // 一覧取得の共通処理。キャッシュがあれば即座に描画し、いずれの場合も
  // サーバーから取り直して最新に揃える(stale-while-revalidate)。
  // フォルダ/ラベルと検索で違うのは「どのキーか」「何を呼ぶか」だけなので、そこだけ引数に取る。
  const loadPage = (key: string, fetchPage: () => Promise<MailPage>, prepend: Email[] = []) => {
    const cached = mailCache.get(key);
    if (cached) {
      setEmails([...prepend, ...cached.emails]);
      setNextPageToken(cached.nextPageToken);
    }

    startMailTransition(async () => {
      const page = await fetchPage();
      setCachedPage(key, page);
      applyMailPage(page, (_prev, fetched) => [...prepend, ...fetched]);
    });
  };

  // フォルダ/ラベルの表示に切り替える。フォルダ一覧を出すことは検索から抜けることでもあるため、
  // 検索状態のリセットもここに集約する(呼び出し側ごとに書くと漏れる)。
  // ローカル限定メール(送信モック)のうち対象フォルダに属するものは先頭に合成する。
  const loadMailPage = (folder: MailFolder, label: string | null) => {
    setSearchQuery('');
    setActiveSearch('');
    const localForFolder = label ? [] : localOnlyEmails.filter((email) => email.folder === folder);
    loadPage(
      mailCacheKey(folder, label),
      () => fetchMailsAction(folder, label ?? undefined),
      localForFolder
    );
  };

  // 検索の確定 — Gmail 側の全文検索に投げ、フォルダを跨いだ結果で一覧を差し替える。
  // ローカル限定メール(送信モック)は Gmail 上に無いので検索結果には合成しない。
  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();

    // 空で確定(✕ を含む)したら検索を抜け、元のフォルダ表示に戻す。
    // 未確定の入力を消しただけなら一覧は既にフォルダ表示なので、取り直さない。
    if (!trimmed) {
      setSearchQuery('');
      if (!activeSearch) return;
      setSelectedId(null);
      loadMailPage(activeFolder, activeLabel);
      return;
    }

    setSearchQuery(trimmed);
    setActiveSearch(trimmed);
    setSelectedId(null);
    loadPage(searchCacheKey(trimmed), () => searchMailsAction(trimmed));
  };

  // 現在表示中の一覧のキャッシュキー。検索中は検索結果、それ以外はフォルダ/ラベル。
  const listKey = activeSearch ? searchCacheKey(activeSearch) : mailCacheKey(activeFolder, activeLabel);

  // Handle folder switching — サーバーから該当フォルダのメールを取得する
  const handleSelectFolder = (folder: MailFolder) => {
    setActiveFolder(folder);
    setActiveLabel(null);
    setSelectedId(null);
    loadMailPage(folder, null);
  };

  // Handle label switching — サーバーから該当ラベルのメールを取得する
  const handleSelectLabel = (label: string) => {
    setActiveLabel(label);
    setSelectedId(null);
    loadMailPage(activeFolder, label);
  };

  // Handle "load more" — 現在のフォルダ/ラベル(検索中は検索結果)の続きを取得して末尾に追加する
  const handleLoadMore = () => {
    if (!nextPageToken) return;
    startLoadMoreTransition(async () => {
      const page = activeSearch
        ? await searchMailsAction(activeSearch, nextPageToken)
        : await fetchMailsAction(activeFolder, activeLabel ?? undefined, nextPageToken);
      // 追加読み込み分もキャッシュに足し、再訪時に読み込み済みの範囲まで復元されるようにする。
      // キャッシュはサーバー由来のメールだけを持つので、表示リストではなく前回のキャッシュに継ぎ足す。
      setCachedPage(listKey, {
        emails: [...(mailCache.get(listKey)?.emails ?? []), ...page.emails],
        nextPageToken: page.nextPageToken,
      });
      applyMailPage(page, (prev, fetched) => [...prev, ...fetched]);
    });
  };

  // キャッシュ済みの全ページに対して 1 通の変更を反映する。
  // これをしないと、操作したメールが別フォルダの古いキャッシュに元の状態のまま残る。
  const patchCachedEmail = (id: string, patch: (email: Email) => Email) => {
    mailCache.forEach((page, key) => {
      if (!page.emails.some((email) => email.id === id)) return;
      mailCache.set(key, {
        ...page,
        emails: page.emails.map((email) => (email.id === id ? patch(email) : email)),
      });
    });
  };

  // フォルダ所属が変わる操作の後は、対象フォルダのキャッシュを捨てて次回に取り直す。
  const invalidateCachedFolders = (folders: MailFolder[]) => {
    folders.forEach((folder) => mailCache.delete(mailCacheKey(folder, null)));
  };

  // Handle email selection & mark as read
  const handleSelectEmail = (id: string) => {
    setSelectedId(id);
    const target = emails.find((email) => email.id === id);
    const wasUnread = !!target && !target.isRead;
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, isRead: true } : email))
    );
    // 既読のメールを開き直した場合は書き換える内容が無いので、キャッシュ走査ごと省く。
    if (wasUnread) {
      patchCachedEmail(id, (email) => ({ ...email, isRead: true }));
    }
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

    // 一覧の body は snippet のみのため、未取得なら詳細を開いたタイミングで本文を取りに行く。
    if (!target?.bodyLoaded) {
      setLoadingBodyId(id);
      startMailTransition(async () => {
        try {
          const full = await fetchMailBodyAction(id);
          if (!full) return;
          // isRead/isStarred 等は既存の楽観的更新を優先し、本文関連フィールドだけ差し替える。
          const patch = (email: Email): Email => ({
            ...email,
            body: full.body,
            bodyHtml: full.bodyHtml,
            bodyLoaded: full.bodyLoaded,
          });
          setEmails((prev) => prev.map((email) => (email.id === id ? patch(email) : email)));
          patchCachedEmail(id, patch);
        } catch {
          showToast('メール本文の取得に失敗しました', 'error');
        } finally {
          setLoadingBodyId((prev) => (prev === id ? null : prev));
        }
      });
    }
  };

  // Handle star toggle
  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const toggleStarred = (list: Email[]) =>
      list.map((email) => (email.id === id ? { ...email, isStarred: !email.isStarred } : email));

    // starred フォルダは所属自体が変わるため、キャッシュを捨てて次回取り直す。
    // 破棄を先に行い、直後の patch が捨てるページを書き換えずに済むようにする。
    invalidateCachedFolders(['starred']);
    patchCachedEmail(id, (email) => ({ ...email, isStarred: !email.isStarred }));

    setEmails((prevEmails) => {
      const oldIndex = prevEmails.findIndex((email) => email.id === id);
      const toggledEmails = toggleStarred(prevEmails);
      // starred フォルダを表示中の場合、emails はサーバーから取得した固定リストなので
      // (旧実装のような都度フィルタが無い)、unstar したメールは明示的にリストから除く。
      // 検索中の一覧はフォルダに紐付かないため、この除去は行わない。
      const isStarredList = !activeSearch && activeFolder === 'starred';
      const nextEmails = isStarredList ? getFilteredEmails(toggledEmails, 'starred') : toggledEmails;

      if (isStarredList && selectedId === id) {
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

  // Handle archive toggle — アーカイブ済み(folder === 'archive')なら解除、それ以外はアーカイブする。
  // Gmail 側では INBOX ラベルの付け外しで表現される。
  const handleToggleArchive = (id: string) => {
    const target = emails.find((email) => email.id === id);
    if (!target) return;
    const willArchive = target.folder !== 'archive';
    const nextFolder: MailFolder = willArchive ? 'archive' : 'inbox';

    // inbox / archive 表示中は操作後に対象がそのフォルダの条件を満たさなくなるためリストから除く。
    // ラベル表示中・検索結果表示中はフォルダ条件で絞っていないので残す。
    const leavesCurrentList =
      !activeSearch && !activeLabel && (activeFolder === 'inbox' || activeFolder === 'archive');

    const applyFolder = (list: Email[]) =>
      list.map((email) => (email.id === id ? { ...email, folder: nextFolder } : email));

    setEmails((prev) => (leavesCurrentList ? prev.filter((email) => email.id !== id) : applyFolder(prev)));
    // inbox ⇔ archive の移動なので、両フォルダのキャッシュを捨てて次回取り直す。
    // 破棄を先に行い、直後の patch が捨てるページを書き換えずに済むようにする。
    invalidateCachedFolders(['inbox', 'archive']);
    patchCachedEmail(id, (email) => ({ ...email, folder: nextFolder }));
    if (leavesCurrentList && selectedId === id) {
      setSelectedId(null);
    }

    if (isLocalOnlyEmail(id)) {
      setLocalOnlyEmails(applyFolder);
      showToast(willArchive ? 'Archived' : 'Moved to Inbox', 'success');
      return;
    }

    // 未読メールの移動分だけ INBOX の未読数を補正する。
    // archive は複合クエリのためサーバー側でも 0 固定(getUnreadCounts)なので触らない。
    if (!target.isRead) {
      setUnreadCounts((prev) => ({
        ...prev,
        inbox: willArchive ? Math.max(0, prev.inbox - 1) : prev.inbox + 1,
      }));
    }

    startMailTransition(async () => {
      await toggleArchiveAction(id, willArchive);
      showToast(willArchive ? 'Archived' : 'Moved to Inbox', 'success');
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
    emails,
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
            {activeSearch ? (
              <>Search: <strong className="text-[var(--text)]">{activeSearch}</strong></>
            ) : activeLabel ? (
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
              <option value="folder:all">ALL MAIL</option>
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
          emails={emails}
          selectedId={selectedId}
          onSelectEmail={handleSelectEmail}
          onToggleStar={handleToggleStar}
          onToggleArchive={handleToggleArchive}
          activeFolder={activeFolder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          activeSearch={activeSearch}
          hasMore={!!nextPageToken}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />

        {/* Pane 3: Email Detail */}
        <MailDetail
          email={selectedEmail}
          isBodyLoading={!!selectedEmail && loadingBodyId === selectedEmail.id}
          onTaskify={handleTaskify}
          onAIDraft={handleAIDraft}
          onToggleArchive={handleToggleArchive}
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
