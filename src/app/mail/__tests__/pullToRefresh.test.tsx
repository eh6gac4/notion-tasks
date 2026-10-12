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

function scrollArea() {
  return screen.getByRole('listbox', { name: 'Email list' }).parentElement!;
}

function pull(target: Element = scrollArea(), dx = 0, dy = 160, end = 'touchEnd') {
  fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: 100 }] });
  fireEvent.touchMove(target, { touches: [{ clientX: 100 + dx, clientY: 100 + dy }] });
  fireEvent[end as 'touchEnd' | 'touchCancel'](target, { changedTouches: [{ clientX: 100 + dx, clientY: 100 + dy }] });
}

const props = getDefaultMailManagerProps();
const freshPage: MailPage = {
  emails: [{ ...props.initialEmails[0], id: 'fresh-mail', subject: 'Freshly fetched email' }],
  nextPageToken: 'fresh-page-token',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchMailsAction).mockResolvedValue(freshPage);
  vi.mocked(searchMailsAction).mockResolvedValue(freshPage);
});

describe('メールの pull to refresh', () => {
  it('replaces the inbox with the latest first page and uses its pagination token', async () => {
    render(<MailManager {...props} initialNextPageToken="old-token" />);
    pull();
    await screen.findByText('Freshly fetched email');
    await waitFor(() => expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument());
    expect(fetchMailsAction).toHaveBeenCalledWith('inbox', undefined);
    vi.mocked(fetchMailsAction).mockResolvedValueOnce({ emails: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(fetchMailsAction).toHaveBeenCalledWith('inbox', undefined, 'fresh-page-token'));
  });

  it.each(['folder:sent', 'label:Work'])('refreshes the selected context %s', async (context) => {
    render(<MailManager {...props} initialLabels={['Work']} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: context } });
    await screen.findByText('Freshly fetched email');
    await waitFor(() => expect(document.querySelector('main')).not.toHaveClass('opacity-60'));
    vi.mocked(fetchMailsAction).mockClear();
    pull();
    await waitFor(() => expect(fetchMailsAction).toHaveBeenCalledWith(
      context === 'folder:sent' ? 'sent' : 'inbox', context === 'label:Work' ? 'Work' : undefined
    ));
  });

  it('refreshes the submitted search and keeps unsubmitted input unchanged', async () => {
    render(<MailManager {...props} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search mail' }), { target: { value: 'invoice' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('Freshly fetched email');
    vi.mocked(searchMailsAction).mockClear();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search mail' }), { target: { value: 'draft input' } });
    pull();
    await waitFor(() => expect(searchMailsAction).toHaveBeenCalledWith('invoice'));
    expect(screen.getByRole('textbox', { name: 'Search mail' })).toHaveValue('draft input');
    expect(fetchMailsAction).not.toHaveBeenCalled();
  });

  it('retains emails on failure and allows a retry', async () => {
    vi.mocked(fetchMailsAction).mockRejectedValueOnce(new Error('offline'));
    render(<MailManager {...props} />);
    pull();
    await screen.findByText('メールの更新に失敗しました');
    expect(screen.getByText(props.initialEmails[0].subject)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument());
    pull();
    await screen.findByText('Freshly fetched email');
  });

  it('ignores refresh responses after switching folders', async () => {
    let resolve!: (page: MailPage) => void;
    vi.mocked(fetchMailsAction).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<MailManager {...props} />);
    pull();
    await waitFor(() => expect(fetchMailsAction).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'folder:sent' } });
    await screen.findByText('Freshly fetched email');
    await act(async () => resolve({ emails: [], nextPageToken: undefined }));
    expect(screen.getByText('Freshly fetched email')).toBeInTheDocument();
  });
});

describe('更新ジェスチャーの境界', () => {
  it.each([
    [0, 60, 'touchEnd'],
    [0, -160, 'touchEnd'],
    [160, 10, 'touchEnd'],
    [0, 160, 'touchCancel'],
  ])('does not refresh for dx=%s dy=%s %s', async (dx, dy, end) => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<MailList emails={[]} selectedId={null} onSelectEmail={vi.fn()} onRefresh={onRefresh} />);
    pull(scrollArea(), dx, dy, end);
    await act(async () => {});
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does not intercept scrolling away from the top', async () => {
    const onRefresh = vi.fn();
    render(<MailList emails={[]} selectedId={null} onSelectEmail={vi.fn()} onRefresh={onRefresh} />);
    scrollArea().scrollTop = 100;
    pull();
    await act(async () => {});
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('shows pull feedback, suppresses duplicate requests and the click after pulling a row', async () => {
    let resolve!: () => void;
    const onRefresh = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const onSelectEmail = vi.fn();
    const onToggleArchive = vi.fn();
    render(<MailList emails={props.initialEmails} selectedId={null} onSelectEmail={onSelectEmail} onToggleArchive={onToggleArchive} onRefresh={onRefresh} />);
    const row = screen.getAllByRole('option')[0];
    fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 150 }] });
    expect(screen.getByText('Pull to refresh')).toBeInTheDocument();
    fireEvent.touchMove(row, { touches: [{ clientX: 100, clientY: 260 }] });
    expect(screen.getByText('Release to refresh')).toBeInTheDocument();
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 100, clientY: 260 }] });
    fireEvent.click(row);
    expect(onSelectEmail).not.toHaveBeenCalled();
    expect(onToggleArchive).not.toHaveBeenCalled();
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    pull();
    await act(async () => {});
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
  });

  it('preserves horizontal swipe to archive', async () => {
    const onRefresh = vi.fn();
    const onToggleArchive = vi.fn();
    render(<MailList emails={props.initialEmails} selectedId={null} onSelectEmail={vi.fn()} onToggleArchive={onToggleArchive} onRefresh={onRefresh} />);
    pull(screen.getAllByRole('option')[0], 100, 10);
    await act(async () => {});
    expect(onToggleArchive).toHaveBeenCalledWith(props.initialEmails[0].id);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('ignores pulling while other mail requests are pending', async () => {
    const onRefresh = vi.fn();
    render(<MailList emails={[]} selectedId={null} onSelectEmail={vi.fn()} onRefresh={onRefresh} isLoading />);
    pull();
    await act(async () => {});
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
