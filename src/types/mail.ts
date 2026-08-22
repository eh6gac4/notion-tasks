export type MailFolder = 'all' | 'inbox' | 'starred' | 'sent' | 'trash' | 'archive';

export interface EmailSender {
  name: string;
  email: string;
  avatar?: string;
}

export interface Email {
  id: string;
  sender: EmailSender;
  recipients: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  bodyLoaded?: boolean;
  date: string;
  folder: MailFolder;
  isRead: boolean;
  isStarred: boolean;
  labels?: string[];
}

export interface MailPage {
  emails: Email[];
  nextPageToken?: string;
}

export interface ComposeDraft {
  to: string;
  subject: string;
  body: string;
}

export interface MailState {
  emails: Email[];
  selectedId: string | null;
  activeFolder: MailFolder;
  isComposeOpen: boolean;
  taskifyEmail: Email | null;
  aiDraftEmail: Email | null;
  toastMessage: string | null;
}
