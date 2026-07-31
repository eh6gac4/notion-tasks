# Project: Notion Mail Mock Feature

## Architecture
The Notion Mail feature (`/mail`) is built as a client-side mock feature within Next.js 16 (App Router) in `src/app/mail/page.tsx`. It uses a 3-pane layout (Sidebar, Mail List, Detail View) with overlay modals (Compose, Taskify, AI Draft) and toast notifications.

### Data Flow & Component Architecture
```
src/app/mail/page.tsx (MailManager orchestrator state)
├── MailSidebar (Folder filter: Inbox, Starred, Sent, Trash, Archive)
├── MailList (Email summary list + Keyboard shortcuts 'j' / 'k')
├── MailDetail (Email header/body + Notion Taskify button + AI Draft button)
│   ├── TaskifyModal (Convert email to Notion Task form & toast trigger)
│   └── AIDraftModal (AI prompt input + CyberLoader + Compose trigger)
├── MailComposeModal (Notion-like markdown editor + 'c' shortcut trigger)
│   └── SlashCommandMenu ('/' command popup with formatting & AI options)
└── MailToast (Toast feedback notification queue)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | `/mail` Route & 3-Pane Layout | Single/3-pane layout, sidebar navigation, folder filter | M1 | survey |
| F2 | Email List & Mock Store | Client-side email state store with initial mock data | M1 | survey |
| F3 | Keyboard Shortcuts | `j`/`k` to navigate mail selection, `c` to open compose modal | M1 | survey |
| F4 | Notion Compose Editor | Markdown parsing & live preview in compose window | M2 | survey |
| F5 | Slash Command Popup | `/` trigger popup menu for formatting, task, AI options | M2 | survey |
| F6 | Email Detail View | Full email display using MailViewer component | M3 | survey |
| F7 | Notion Task Conversion | Button & modal flow to convert email to Notion DB task | M3 | survey |
| F8 | AI Email Draft Generation | Button & modal flow with CyberLoader & draft insertion | M3 | survey |
| F9 | Comprehensive E2E/Unit Suite | Unit tests for components & E2E tests for user interactions | M-TEST | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Gmail Core UI & Navigation | F1, F2, F3: `/mail` page, sidebar, list, mock store, `j`/`k`/`c` shortcuts | none | PLANNED |
| M2 | Notion Editor & Slash Menu | F4, F5: `MailComposeModal`, Markdown preview, `/` SlashCommandMenu | M1 | PLANNED |
| M3 | Notion Integration & AI Flows | F6, F7, F8: `MailDetail`, `TaskifyModal`, `AIDraftModal`, `MailToast` | M1, M2 | PLANNED |
| M-TEST | E2E Testing Suite Track | F9: `TEST_INFRA.md`, E2E test cases, publishes `TEST_READY.md` | none | PLANNED |
| M-FINAL | Final Verification | E2E Test Suite verification (Phase 1) & Adversarial Hardening (Phase 2) | M1, M2, M3, M-TEST | PLANNED |

## Interface Contracts

### `src/types/mail.ts`
```typescript
export type MailFolder = 'inbox' | 'starred' | 'sent' | 'trash' | 'archive';

export interface Email {
  id: string;
  sender: { name: string; email: string; avatar?: string };
  recipients: string[];
  subject: string;
  body: string; // Markdown body
  date: string;
  folder: MailFolder;
  isRead: boolean;
  isStarred: boolean;
  labels?: string[];
}

export interface ComposeDraft {
  to: string;
  subject: string;
  body: string;
}
```

### State Store & Handlers (`src/lib/mockMailData.ts` / Mail Manager state)
```typescript
export interface MailState {
  emails: Email[];
  selectedId: string | null;
  activeFolder: MailFolder;
  isComposeOpen: boolean;
  taskifyEmail: Email | null;
  aiDraftEmail: Email | null;
  toastMessage: string | null;
}
```

## Code Layout
- `src/types/mail.ts` — Data models & types
- `src/lib/mockMailData.ts` — Initial mock emails dataset
- `src/app/mail/page.tsx` — Main App Router page
- `src/components/mail/MailSidebar.tsx` — Folder sidebar
- `src/components/mail/MailList.tsx` — Email list pane with keyboard shortcut handlers
- `src/components/mail/MailDetail.tsx` — Email viewer & action buttons
- `src/components/mail/MailComposeModal.tsx` — Compose modal & Markdown editor
- `src/components/mail/SlashCommandMenu.tsx` — `/` slash command popup
- `src/components/mail/TaskifyModal.tsx` — Notion task creation modal
- `src/components/mail/AIDraftModal.tsx` — AI email draft prompt modal
- `src/components/mail/MailToast.tsx` — Toast notification
- `src/components/mail/__tests__/` — Component unit tests
