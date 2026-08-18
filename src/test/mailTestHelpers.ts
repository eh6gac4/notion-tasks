import { MailFolder, MailPage } from '@/types/mail';
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from '@/lib/mockMailData';
import { MailManagerProps } from '@/components/mail/MailManager';

// src/lib/gmail.ts の dev フォールバック(getMails/getMailLabels/getUnreadCounts)と
// 同じ計算をテスト側でも再現する。MailManager は Server Component から props で
// 初期データを受け取る設計になったため、テストでは自前でこれらを組み立てて渡す。

export function getMockLabels(): string[] {
  const labels = new Set<string>();
  INITIAL_MOCK_EMAILS.forEach((e) => e.labels?.forEach((l) => labels.add(l)));
  return Array.from(labels).sort();
}

export function getMockUnreadCounts(): Record<MailFolder, number> {
  const counts: Record<MailFolder, number> = { all: 0, inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 };
  INITIAL_MOCK_EMAILS.forEach((email) => {
    if (!email.isRead && email.folder !== 'trash') {
      counts[email.folder] = (counts[email.folder] || 0) + 1;
    }
  });
  // all はゴミ箱以外の未読合計。starred は inbox/sent/archive のいずれかと重複カウントされるため除外する。
  counts.all = counts.inbox + counts.sent + counts.archive;
  return counts;
}

export function getDefaultMailManagerProps(): MailManagerProps {
  return {
    initialEmails: getFilteredEmails(INITIAL_MOCK_EMAILS, 'inbox'),
    initialLabels: getMockLabels(),
    initialUnreadCounts: getMockUnreadCounts(),
  };
}

// @/app/mail/actions を vi.mock() するテストで使う、fetchMailsAction のモック実装。
// src/lib/gmail.ts の dev フォールバック(getMails)と同じ計算を再現する。
// vi.mock の factory は hoist されるため、呼び出し側では動的 import 経由でこの関数を
// 使うこと(トップレベル import すると TDZ エラーになる)。
export function mockFetchMails(folder: MailFolder, label?: string): Promise<MailPage> {
  const filtered = label
    ? INITIAL_MOCK_EMAILS.filter((e) => e.labels?.includes(label))
    : getFilteredEmails(INITIAL_MOCK_EMAILS, folder);
  return Promise.resolve({ emails: filtered });
}
