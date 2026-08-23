import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MailManager } from '@/components/mail/MailManager';
import { getDefaultMailManagerProps } from '@/test/mailTestHelpers';
import { Email } from '@/types/mail';

// メール詳細を開いたタイミングで本文(bodyHtml 含む)を遅延取得する挙動の検証。
// src/app/mail/__tests__/page.test.tsx と同じモック境界パターンを使う。
vi.mock('@/app/mail/actions', async () => {
  const { mockFetchMails } = await import('@/test/mailTestHelpers');
  return {
    fetchMailsAction: vi.fn(mockFetchMails),
    fetchMailBodyAction: vi.fn(),
    markAsReadAction: vi.fn().mockResolvedValue(undefined),
    toggleStarAction: vi.fn().mockResolvedValue(undefined),
  };
});

// mockMailData の id は 'mail-N' 形式で、送信モック(ローカル限定メール)の判定
// isLocalOnlyEmail(id.startsWith('mail-')) に引っかかってしまう。実際の Gmail ID は
// このプレフィックスを持たないため、遅延取得を検証するにはそれを模した ID が要る。
function buildGmailLikeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: '18abctestmessage',
    sender: { name: 'Real Sender', email: 'real.sender@example.com' },
    recipients: ['user@notion-tasks.local'],
    subject: 'Gmail 実データ相当のテストメール',
    body: 'この行の後に…見えるはずの改行',
    date: '2026-07-31T09:30:00Z',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    ...overrides,
  };
}

describe('メール詳細の本文遅延取得', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('メールを選択すると fetchMailBodyAction が1回呼ばれ、返却された HTML が iframe に反映される', async () => {
    const { fetchMailBodyAction } = await import('@/app/mail/actions');
    const target = buildGmailLikeEmail();
    vi.mocked(fetchMailBodyAction).mockResolvedValue({
      ...target,
      body: 'plain fallback',
      bodyHtml: '<p>Hello HTML</p>',
      bodyLoaded: true,
    });

    const props = getDefaultMailManagerProps();
    render(<MailManager {...props} initialEmails={[target, ...props.initialEmails]} />);

    const row = screen.getAllByText(target.subject)[0];
    fireEvent.click(row);

    expect(fetchMailBodyAction).toHaveBeenCalledTimes(1);
    expect(fetchMailBodyAction).toHaveBeenCalledWith(target.id);

    await waitFor(() => {
      const iframe = screen.getByTitle('メール本文');
      expect(iframe.getAttribute('srcdoc')).toContain('<p>Hello HTML</p>');
    });
  });

  it('bodyLoaded 済みのメールを選択しても再取得しない', async () => {
    // 一覧取得直後や再選択で「既に本文取得済み」の状態を再現する。startTransition の
    // コミットタイミングに依存させないため、初回取得が完了した後の状態を直接 props で与える。
    const { fetchMailBodyAction } = await import('@/app/mail/actions');
    const target = buildGmailLikeEmail({
      isRead: true,
      bodyHtml: '<p>Hello HTML</p>',
      bodyLoaded: true,
    });

    const props = getDefaultMailManagerProps();
    render(<MailManager {...props} initialEmails={[target, ...props.initialEmails]} />);

    const row = screen.getAllByText(target.subject)[0];
    fireEvent.click(row);

    expect(screen.getByTitle('メール本文')).toBeInTheDocument();
    expect(fetchMailBodyAction).not.toHaveBeenCalled();
  });
});
