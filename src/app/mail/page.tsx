import { MailManager } from '@/components/mail/MailManager';
import { fetchInitialMailDataAction } from './actions';

export default async function MailPage() {
  const { emails, labels, unreadCounts } = await fetchInitialMailDataAction();

  return (
    <MailManager
      initialEmails={emails}
      initialLabels={labels}
      initialUnreadCounts={unreadCounts}
    />
  );
}
