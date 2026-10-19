import { MailManager } from '@/components/mail/MailManager';
import { fetchInitialMailDataAction, fetchMailBodyAction } from './actions';
import { GoogleReauthScreen } from './GoogleReauthScreen';

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; messageId?: string }>;
}) {
  const { reauth, messageId } = await searchParams;
  const data = await fetchInitialMailDataAction();

  if (data.reauthRequired) {
    return <GoogleReauthScreen reason={reauth} />;
  }

  const selectedEmail = typeof messageId === 'string' && /^[a-f0-9]{10,32}$/i.test(messageId)
    ? await fetchMailBodyAction(messageId)
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
