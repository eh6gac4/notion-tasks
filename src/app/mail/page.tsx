import { MailManager } from '@/components/mail/MailManager';
import { fetchInitialMailDataAction } from './actions';

export default async function MailPage() {
  const { mailPage, labels, unreadCounts } = await fetchInitialMailDataAction();

  return (
    <MailManager
      initialEmails={mailPage.emails}
      initialNextPageToken={mailPage.nextPageToken}
      initialLabels={labels}
      initialUnreadCounts={unreadCounts}
    />
  );
}
