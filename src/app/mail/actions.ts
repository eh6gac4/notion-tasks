"use server"

import { requireAuth } from "@/lib/require-auth"
import { getMails, getMailBody, toggleMailStar, markMailAsRead, getMailLabels, getUnreadCounts } from "@/lib/gmail"
import type { Email, MailFolder } from "@/types/mail"

export async function fetchInitialMailDataAction(): Promise<{
  emails: Email[]
  labels: string[]
  unreadCounts: Record<MailFolder, number>
}> {
  await requireAuth()
  const [emails, labels, unreadCounts] = await Promise.all([
    getMails("inbox"),
    getMailLabels(),
    getUnreadCounts(),
  ])
  return { emails, labels, unreadCounts }
}

export async function fetchMailsAction(folder: MailFolder, label?: string): Promise<Email[]> {
  await requireAuth()
  return getMails(folder, label)
}

export async function fetchMailBodyAction(id: string): Promise<Email | null> {
  await requireAuth()
  return getMailBody(id)
}

export async function toggleStarAction(id: string, starred: boolean): Promise<void> {
  await requireAuth()
  await toggleMailStar(id, starred)
}

export async function markAsReadAction(id: string): Promise<void> {
  await requireAuth()
  await markMailAsRead(id)
}

export async function fetchUnreadCountsAction(): Promise<Record<MailFolder, number>> {
  await requireAuth()
  return getUnreadCounts()
}
