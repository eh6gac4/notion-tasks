'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Email, MailFolder } from '@/types/mail';

// スワイプでアーカイブを確定する横方向の移動量(px)
const SWIPE_THRESHOLD = 80;
// 行が追従して動く最大量。しきい値を超えたことが視覚的に分かる程度に留める。
const SWIPE_MAX_OFFSET = 120;

export interface MailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  onToggleStar?: (id: string, e: React.MouseEvent) => void;
  onToggleArchive?: (id: string) => void;
  activeFolder?: MailFolder;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  /** Enter で確定したとき、および ✕ で消したときに呼ばれる。空文字なら検索解除。
   *  入力欄の値も呼び出し側が確定値に揃えるため、✕ は onSearchChange を呼ばない。 */
  onSearchSubmit?: (query: string) => void;
  /** 確定済みの検索語。空なら非検索状態。 */
  activeSearch?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

function formatDate(isoString: string): string {
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
}

interface MailListItemProps {
  email: Email;
  isSelected: boolean;
  swipeDx: number;
  onRowClick: (id: string) => void;
  onTouchStart: (id: string, e: React.TouchEvent) => void;
  onTouchMove: (id: string, e: React.TouchEvent) => void;
  onTouchEnd: (id: string) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
}

// 1 行を memo 化する。スワイプ中は該当行の swipeDx だけが変わるため、
// これが無いと touchmove のたびに全行が再描画されて指の追従が鈍る。
const MailListItem = React.memo(function MailListItem({
  email,
  isSelected,
  swipeDx,
  onRowClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleStar,
}: MailListItemProps) {
  const isArchived = email.folder === 'archive';
  const isSwipeArmed = Math.abs(swipeDx) >= SWIPE_THRESHOLD;

  return (
    <div className="relative overflow-hidden">
      {/* スワイプ時に行の背面から現れるアーカイブ表示 */}
      {swipeDx !== 0 && (
        <div
          className={`absolute inset-0 flex items-center px-4 text-[10px] font-pixel uppercase tracking-wider ${
            swipeDx < 0 ? 'justify-end' : 'justify-start'
          } ${isSwipeArmed ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-dim)]'}`}
          aria-hidden="true"
        >
          {isArchived ? 'Unarchive' : 'Archive'}
        </div>
      )}
      <div
        onClick={() => onRowClick(email.id)}
        onTouchStart={(e) => onTouchStart(email.id, e)}
        onTouchMove={(e) => onTouchMove(email.id, e)}
        onTouchEnd={() => onTouchEnd(email.id)}
        onTouchCancel={() => onTouchEnd(email.id)}
        style={swipeDx !== 0 ? { transform: `translateX(${swipeDx}px)` } : undefined}
        className={`p-3 cursor-pointer transition-colors relative border-l-4 touch-pan-y ${
          isSelected
            ? 'bg-[var(--surface-2)] border-[var(--accent)]'
            : 'bg-[var(--bg)] hover:bg-[var(--surface)] border-transparent'
        }`}
        role="option"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(email.id);
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
                email.isRead ? 'text-[var(--text-dim)] font-normal' : 'text-[var(--text)] font-bold'
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
              onToggleStar(email.id, e);
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
    </div>
  );
});

export function MailList({
  emails,
  selectedId,
  onSelectEmail,
  onToggleStar,
  onToggleArchive,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  activeSearch = '',
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: MailListProps) {
  // スワイプ中の行と移動量。touchend で確定し、しきい値を超えていればアーカイブする。
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  // touchend のハンドラを再生成せずに最新のスワイプ量を読むための写し。
  // state に依存させると touchmove のたびに全行のコールバックが変わり memo が無効化される。
  const swipeRef = useRef<{ id: string; dx: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // スワイプ確定直後に発火する click でメールが開くのを防ぐ
  const suppressClickRef = useRef<boolean>(false);
  // 親から渡されるハンドラは毎レンダー作り直されるため、参照を ref に逃がして
  // 行に渡すコールバックを固定する。これが無いと memo 化した行が毎回再描画される。
  const handlersRef = useRef({ onSelectEmail, onToggleStar, onToggleArchive });
  useEffect(() => {
    handlersRef.current = { onSelectEmail, onToggleStar, onToggleArchive };
  });

  const updateSwipe = (next: { id: string; dx: number } | null) => {
    swipeRef.current = next;
    setSwipe(next);
  };

  const handleTouchStart = useCallback((id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    updateSwipe({ id, dx: 0 });
  }, []);

  const handleTouchMove = useCallback((id: string, e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // 縦方向の動きが優勢なうちはリストのスクロールを優先する
    if (Math.abs(dx) <= Math.abs(dy)) return;
    const clamped = Math.max(-SWIPE_MAX_OFFSET, Math.min(SWIPE_MAX_OFFSET, dx));
    updateSwipe({ id, dx: clamped });
  }, []);

  const handleTouchEnd = useCallback((id: string) => {
    const current = swipeRef.current;
    touchStartRef.current = null;
    updateSwipe(null);
    if (current && current.id === id && Math.abs(current.dx) >= SWIPE_THRESHOLD) {
      suppressClickRef.current = true;
      handlersRef.current.onToggleArchive?.(id);
    }
  }, []);

  const handleRowClick = useCallback((id: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    handlersRef.current.onSelectEmail(id);
  }, []);

  const handleToggleStar = useCallback((id: string, e: React.MouseEvent) => {
    handlersRef.current.onToggleStar?.(id, e);
  }, []);

  return (
    <div className={`w-full md:w-80 flex-shrink-0 bg-[var(--bg)] border-r border-[var(--border)] flex-col min-h-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
      {/* Search Header */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)] space-y-2">
        {/* 検索は Enter で確定してサーバー(Gmail)側の全文検索に投げる。
            打鍵ごとに API を叩かないよう、form の submit を唯一の起点にする。 */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.(searchQuery);
          }}
          className="relative flex items-center"
        >
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
              onClick={() => onSearchSubmit?.('')}
              type="button"
              className="absolute right-2 text-[var(--text-dim)] hover:text-[var(--text)] text-xs font-mono"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>
        <div className="text-[10px] text-[var(--text-faint)] font-mono px-1 flex justify-between">
          <span>{emails.length} messages</span>
          <span className="text-[var(--accent)] font-pixel">
            {searchQuery && searchQuery.trim() !== activeSearch ? 'enter to search all mail' : 'j / k to navigate'}
          </span>
        </div>
      </div>

      {/* Email List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]" role="listbox" aria-label="Email list">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-dim)] font-mono">
            {activeSearch ? 'No emails match your search.' : 'No emails in this folder.'}
          </div>
        ) : (
          emails.map((email) => (
            <MailListItem
              key={email.id}
              email={email}
              isSelected={email.id === selectedId}
              swipeDx={swipe?.id === email.id ? swipe.dx : 0}
              onRowClick={handleRowClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onToggleStar={handleToggleStar}
            />
          ))
        )}
        {hasMore && (
          <div className="p-3">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full py-2 text-xs font-mono text-[var(--text-dim)] border border-[var(--border-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
