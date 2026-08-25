import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/gmail', () => ({
  getMails: vi.fn(),
  getMailBody: vi.fn(),
  toggleMailStar: vi.fn(),
  markMailAsRead: vi.fn(),
  setMailArchived: vi.fn(),
  getMailLabels: vi.fn(),
  getUnreadCounts: vi.fn(),
  createEmptyUnreadCounts: () => ({ all: 0, inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 }),
}));

describe('fetchInitialMailDataAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mails, labels, and unread counts when all succeed', async () => {
    const { getMails, getMailLabels, getUnreadCounts } = await import('@/lib/gmail');
    const { fetchInitialMailDataAction } = await import('../actions');

    vi.mocked(getMails).mockResolvedValue({ emails: [], nextPageToken: undefined });
    vi.mocked(getMailLabels).mockResolvedValue(['Work']);
    vi.mocked(getUnreadCounts).mockResolvedValue({
      all: 1, inbox: 1, starred: 0, sent: 0, archive: 0, trash: 0,
    });

    const result = await fetchInitialMailDataAction();

    expect(result.mailPage.emails).toEqual([]);
    expect(result.labels).toEqual(['Work']);
    expect(result.unreadCounts.inbox).toBe(1);
  });

  it('falls back to empty labels/unreadCounts when those calls fail, but mail list still returns', async () => {
    const { getMails, getMailLabels, getUnreadCounts } = await import('@/lib/gmail');
    const { fetchInitialMailDataAction } = await import('../actions');

    vi.mocked(getMails).mockResolvedValue({ emails: [{ id: '1' } as never], nextPageToken: undefined });
    vi.mocked(getMailLabels).mockRejectedValue(new Error('[gmail] API エラー'));
    vi.mocked(getUnreadCounts).mockRejectedValue(new Error('[gmail] API エラー'));

    const result = await fetchInitialMailDataAction();

    expect(result.mailPage.emails).toHaveLength(1);
    expect(result.labels).toEqual([]);
    expect(result.unreadCounts).toEqual({ all: 0, inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 });
  });

  it('throws when mail list fetch itself fails, so error.tsx can catch it', async () => {
    const { getMails, getMailLabels, getUnreadCounts } = await import('@/lib/gmail');
    const { fetchInitialMailDataAction } = await import('../actions');

    vi.mocked(getMails).mockRejectedValue(new Error('[gmail] アクセストークン取得に失敗しました'));
    vi.mocked(getMailLabels).mockResolvedValue([]);
    vi.mocked(getUnreadCounts).mockResolvedValue({ all: 0, inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 });

    await expect(fetchInitialMailDataAction()).rejects.toThrow('アクセストークン取得に失敗しました');
  });
});
