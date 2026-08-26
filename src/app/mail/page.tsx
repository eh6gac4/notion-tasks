import { MailManager } from '@/components/mail/MailManager';
import { fetchInitialMailDataAction } from './actions';
import { GoogleReauthScreen } from './GoogleReauthScreen';

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string }>;
}) {
  const data = await fetchInitialMailDataAction();

  if (data.reauthRequired) {
    const { reauth } = await searchParams;
    return <GoogleReauthScreen reason={reauth} />;
  }

  return (
    <MailManager
      initialEmails={data.mailPage.emails}
      initialNextPageToken={data.mailPage.nextPageToken}
      initialLabels={data.labels}
      initialUnreadCounts={data.unreadCounts}
    />
  );
}
