import { MailManager } from '@/components/mail/MailManager';
import { fetchInitialMailDataAction, fetchMailBodyAction, searchMailsAction } from './actions';
import { GoogleReauthScreen } from './GoogleReauthScreen';
import { isRfc822MessageId } from '@/lib/mail-link';
import { StatusScreen } from '@/components/StatusScreen';

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; messageId?: string; rfc822msgid?: string }>;
}) {
  const { reauth, messageId, rfc822msgid } = await searchParams;
  const data = await fetchInitialMailDataAction();

  if (data.reauthRequired) {
    return <GoogleReauthScreen reason={reauth} />;
  }

  let resolvedId = typeof messageId === 'string' && /^[a-f0-9]{10,32}$/i.test(messageId) ? messageId : undefined;
  if (!resolvedId && isRfc822MessageId(rfc822msgid)) {
    const matches = await searchMailsAction(`rfc822msgid:${rfc822msgid}`);
    resolvedId = matches.emails[0]?.id;
    if (!resolvedId) {
      return <StatusScreen
        title="メールが見つかりません"
        subtitle="MAIL NOT FOUND"
        message="リンク先のメールが見つかりませんでした。削除済みか、連携中のアカウントに存在しない可能性があります。"
        action={{ label: 'メール一覧へ', href: '/mail' }}
      />;
    }
  }
  const selectedEmail = resolvedId
    ? await fetchMailBodyAction(resolvedId)
    : null;
  const initialEmails = selectedEmail
    ? [selectedEmail, ...data.mailPage.emails.filter((email) => email.id !== selectedEmail.id)]
    : data.mailPage.emails;

  return (
    <MailManager
      key={selectedEmail?.id ?? 'inbox'}
      initialEmails={initialEmails}
      initialSelectedId={selectedEmail?.id}
      initialNextPageToken={data.mailPage.nextPageToken}
      initialLabels={data.labels}
      initialUnreadCounts={data.unreadCounts}
    />
  );
}
