import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MailManager } from '@/components/mail/MailManager';
import { MailList } from '@/components/mail/MailList';
import { getDefaultMailManagerProps } from '@/test/mailTestHelpers';
import { fetchMailsAction, searchMailsAction } from '@/app/mail/actions';
import type { MailPage } from '@/types/mail';

vi.mock('@/app/mail/actions', () => ({
  fetchMailsAction: vi.fn(),
  searchMailsAction: vi.fn(),
  fetchMailBodyAction: vi.fn(),
  markAsReadAction: vi.fn(),
  toggleStarAction: vi.fn(),
  toggleArchiveAction: vi.fn(),
}));

const props = getDefaultMailManagerProps();
const addedEmail = { ...props.initialEmails[0], id: 'mail-added', subject: 'Additional mail' };

function scrollTo(top = 500) {
  const list = screen.getByRole('listbox', { name: 'Email list' }).parentElement!;
  Object.defineProperties(list, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 500 },
  });
  list.scrollTop = top;
  fireEvent.scroll(list);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchMailsAction).mockResolvedValue({ emails: [addedEmail] });
});

describe('メール一覧の自動追加読み込み', () => {
  it('末尾付近で一度だけ追加取得し、メールを開かずに一覧に追加する', async () => {
    let resolve!: (page: MailPage) => void;
    vi.mocked(fetchMailsAction).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<MailManager {...props} initialNextPageToken="next-page" />);
    scrollTo(100);
    expect(fetchMailsAction).not.toHaveBeenCalled();
    scrollTo(410);
    scrollTo();
    scrollTo();
    expect(fetchMailsAction).toHaveBeenCalledTimes(1);
    expect(fetchMailsAction).toHaveBeenCalledWith('inbox', undefined, 'next-page');
    await act(async () => resolve({ emails: [addedEmail] }));
    expect(screen.getByText(addedEmail.subject)).toBeInTheDocument();
    expect(screen.getByText(props.initialEmails[0].subject)).toBeInTheDocument();
    expect(screen.getByText('No Email Selected')).toBeInTheDocument();
    scrollTo();
    expect(fetchMailsAction).toHaveBeenCalledTimes(1);
  });

  it('次ページがあれば続けて取得し、スクロール位置を維持する', async () => {
    vi.mocked(fetchMailsAction).mockResolvedValueOnce({ emails: [addedEmail], nextPageToken: 'page-3' });
    render(<MailManager {...props} initialNextPageToken="page-2" />);
    scrollTo();
    await screen.findByText(addedEmail.subject);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled());
    expect(screen.getByRole('listbox').parentElement!.scrollTop).toBe(500);
    vi.mocked(fetchMailsAction).mockResolvedValueOnce({ emails: [] });
    scrollTo();
    await waitFor(() => expect(fetchMailsAction).toHaveBeenCalledWith('inbox', undefined, 'page-3'));
  });

  it('失敗しても一覧を保持し、手動ボタンから再試行できる', async () => {
    vi.mocked(fetchMailsAction).mockRejectedValueOnce(new Error('offline'));
    render(<MailManager {...props} initialNextPageToken="next-page" />);
    scrollTo();
    await screen.findByText('メールの追加読み込みに失敗しました');
    expect(screen.getByText(props.initialEmails[0].subject)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText(addedEmail.subject);
    expect(fetchMailsAction).toHaveBeenCalledTimes(2);
  });

  it('読み込み中にフォルダを変えても古いメールを混ぜない', async () => {
    let resolve!: (page: MailPage) => void;
    vi.mocked(fetchMailsAction).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<MailManager {...props} initialNextPageToken="next-page" />);
    scrollTo();
    const sentEmail = { ...addedEmail, id: 'sent-mail', subject: 'Sent mail' };
    vi.mocked(fetchMailsAction).mockResolvedValueOnce({ emails: [sentEmail] });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'folder:sent' } });
    await screen.findByText(sentEmail.subject);
    await act(async () => resolve({ emails: [addedEmail], nextPageToken: 'old-token' }));
    expect(screen.queryByText(addedEmail.subject)).not.toBeInTheDocument();
    expect(screen.getByText(sentEmail.subject)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('検索結果の続きも確定済みの検索語とページトークンで取得する', async () => {
    vi.mocked(searchMailsAction).mockResolvedValueOnce({ emails: props.initialEmails, nextPageToken: 'search-page' });
    render(<MailManager {...props} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search mail' }), { target: { value: 'invoice' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled());
    vi.mocked(searchMailsAction).mockResolvedValueOnce({ emails: [addedEmail] });
    scrollTo();
    await screen.findByText(addedEmail.subject);
    expect(searchMailsAction).toHaveBeenLastCalledWith('invoice', 'search-page');
    expect(fetchMailsAction).not.toHaveBeenCalled();
  });

  it.each([
    { hasMore: false },
    { hasMore: true, isLoading: true },
    { hasMore: true, isLoadingMore: true },
  ])('次ページなし・読み込み中には取得しない %j', (state) => {
    const onLoadMore = vi.fn();
    render(<MailList emails={props.initialEmails} selectedId={null} onSelectEmail={vi.fn()} onLoadMore={onLoadMore} {...state} />);
    scrollTo();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
