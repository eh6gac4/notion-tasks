import { Email, MailFolder } from '@/types/mail';

export const INITIAL_MOCK_EMAILS: Email[] = [
  {
    id: 'mail-1',
    sender: {
      name: 'Alex Rivers',
      email: 'alex.rivers@notion.so',
      avatar: 'AR',
    },
    recipients: ['user@notion-tasks.local'],
    subject: 'Q3 Product Roadmap Review & Notion Tasks Integration',
    body: `# Q3 Product Roadmap Review

Hi Team,

Here is the outline for our Q3 priorities regarding the Notion Tasks integration:

- **Notion Mail Sync**: Direct conversion of email messages into actionable database tasks.
- **Cyberpunk UI Refresh**: Dark mode theme with 4px strict grid compliance and crisp micro-interactions.
- **Keyboard Shortcuts**: Power-user navigation using \`j\`, \`k\`, and \`c\` keys for rapid mail triaging.

Please review the attached specs and let me know if you have any feedback before our sync on Friday.

Best regards,  
Alex`,
    date: '2026-07-31T09:30:00Z',
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    labels: ['Product', 'Roadmap'],
  },
  {
    id: 'mail-2',
    sender: {
      name: 'Kaito Tanaka',
      email: 'kaito.t@neontech.io',
      avatar: 'KT',
    },
    recipients: ['user@notion-tasks.local'],
    subject: 'Weekly Cyberpunk UI Sync & Retro Theme Mockups',
    body: `Hey there,

We just updated the CSS design tokens in \`globals.css\`. 

Key changes include:
1. Palette tuned to crimson glowing borders (\`var(--accent)\`).
2. Strictly 4px grid spacing — no \`.5\` classes permitted.
3. CRT scanline visual effect overlay for retro aesthetic.

Let's test the layout on mobile and desktop viewports.

Cheers,  
Kaito`,
    date: '2026-07-31T08:15:00Z',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    labels: ['Design', 'UI'],
  },
  {
    id: 'mail-3',
    sender: {
      name: 'Sarah Chen',
      email: 'schen@devops.org',
      avatar: 'SC',
    },
    recipients: ['user@notion-tasks.local'],
    subject: 'API Spec Update: Antigravity Agent Orchestration',
    body: `Team,

The orchestration layer API specification has been updated:

\`\`\`typescript
export interface AgentTask {
  id: string;
  milestone: 'M1' | 'M2' | 'M3';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED';
}
\`\`\`

All subagents should reference this schema for handoff reporting.

Regards,  
Sarah`,
    date: '2026-07-30T16:45:00Z',
    folder: 'archive',
    isRead: true,
    isStarred: true,
    labels: ['DevOps', 'Spec'],
  },
  {
    id: 'mail-4',
    sender: {
      name: 'You',
      email: 'user@notion-tasks.local',
      avatar: 'ME',
    },
    recipients: ['alex.rivers@notion.so'],
    subject: 'Re: Notion Mail Mock Feature Architecture Proposal',
    body: `Hi Alex,

I have finalized the M1 milestone breakdown:
- App Router route at \`/mail\` with 3-pane responsive layout.
- Client-side mock mail data store.
- Global keyboard navigation (\`j\` / \`k\` / \`c\`).

Unit tests for shortcut suppression and list selection are also ready.

Thanks,  
Developer`,
    date: '2026-07-30T14:20:00Z',
    folder: 'sent',
    isRead: true,
    isStarred: false,
    labels: ['Outbox'],
  },
  {
    id: 'mail-5',
    sender: {
      name: 'CI/CD Bot',
      email: 'no-reply@buildsystem.internal',
      avatar: 'CB',
    },
    recipients: ['user@notion-tasks.local'],
    subject: 'Automated Notification: Build #4082 Completed',
    body: `Build status for commit \`a12e58e\`: SUCCESS.

All 42 unit tests passed. Total build time: 14.2s.

Artifacts generated:
- \`notion-tasks-dist.tar.gz\`
`,
    date: '2026-07-29T11:00:00Z',
    folder: 'trash',
    isRead: true,
    isStarred: false,
    labels: ['System'],
  },
  {
    id: 'mail-6',
    sender: {
      name: 'Elena Rostova',
      email: 'elena@people.io',
      avatar: 'ER',
    },
    recipients: ['user@notion-tasks.local'],
    subject: 'Quarterly Team Feedback Request',
    body: `Hello Everyone,

Please take 5 minutes to complete the Q3 engineering feedback survey.

Your input helps us improve sprint planning, agent orchestration, and tooling support across all sub-projects.

Survey link is available on the internal portal.

Warmly,  
Elena`,
    date: '2026-07-28T10:00:00Z',
    folder: 'inbox',
    isRead: true,
    isStarred: false,
    labels: ['HR'],
  },
];

export function getFilteredEmails(emails: Email[], folder: MailFolder): Email[] {
  if (folder === 'starred') {
    return emails.filter((email) => email.isStarred && email.folder !== 'trash');
  }
  return emails.filter((email) => email.folder === folder);
}
