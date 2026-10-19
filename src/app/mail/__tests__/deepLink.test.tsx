import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import MailPage from '../page';
import { fetchInitialMailDataAction, fetchMailBodyAction, markAsReadAction } from '../actions';
import { getDefaultMailManagerProps } from '@/test/mailTestHelpers';

vi.mock('../actions', () => ({
  fetchInitialMailDataAction: vi.fn(),
  fetchMailBodyAction: vi.fn(),
  markAsReadAction: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
  const props = getDefaultMailManagerProps();
  vi.mocked(fetchInitialMailDataAction).mockResolvedValue({
    reauthRequired: false,
    mailPage: { emails: props.initialEmails },
    labels: props.initialLabels,
    unreadCounts: props.initialUnreadCounts,
  });
});

describe('mail 詳細リンク', () => {
  it('受信トレイにないメールも取得して詳細を開き、既読にする', async () => {
    vi.mocked(fetchMailBodyAction).mockResolvedValue({
      ...getDefaultMailManagerProps().initialEmails[0],
      id: '18abcdef01234567',
      folder: 'archive',
      subject: 'リンク先のメール',
      body: 'リンク先の本文',
      bodyLoaded: true,
      isRead: false,
    });
    const page = await MailPage({ searchParams: Promise.resolve({ messageId: '18abcdef01234567' }) });
    await act(async () => { render(page); });
    expect(fetchMailBodyAction).toHaveBeenCalledWith('18abcdef01234567');
    expect(screen.getByRole('heading', { name: 'リンク先のメール' })).toBeInTheDocument();
    expect(screen.getAllByText('リンク先の本文')).toHaveLength(2);
    await waitFor(() => expect(markAsReadAction).toHaveBeenCalledWith('18abcdef01234567'));
  });

  it('通常アクセスではメール個別取得を行わない', async () => {
    render(await MailPage({ searchParams: Promise.resolve({}) }));
    expect(fetchMailBodyAction).not.toHaveBeenCalled();
    expect(screen.getByText('No Email Selected')).toBeInTheDocument();
  });

  it('再連携が必要なら詳細取得を行わない', async () => {
    vi.mocked(fetchInitialMailDataAction).mockResolvedValue({ reauthRequired: true });
    render(await MailPage({ searchParams: Promise.resolve({ messageId: '18abcdef01234567' }) }));
    expect(fetchMailBodyAction).not.toHaveBeenCalled();
    expect(screen.getByText('Google と再連携する')).toBeInTheDocument();
  });
});
