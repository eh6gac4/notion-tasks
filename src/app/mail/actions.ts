"use server"

import { requireAuth } from "@/lib/require-auth"
import { getMails, getMailBody, toggleMailStar, markMailAsRead, setMailArchived, getMailLabels, getUnreadCounts, createEmptyUnreadCounts } from "@/lib/gmail"
import type { Email, MailFolder, MailPage } from "@/types/mail"

// fulfilled ならその値、rejected ならログを出して既定値にフォールバックする。
// ラベル・未読数のような付随情報は、失敗してもメール一覧の表示を止めたくないために使う。
function withFallback<T>(name: string, result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value
  console.error(`[mail] ${name}取得に失敗しました`, result.reason)
  return fallback
}

export async function fetchInitialMailDataAction(): Promise<{
  mailPage: MailPage
  labels: string[]
  unreadCounts: Record<MailFolder, number>
}> {
  await requireAuth()
  // メール一覧の取得失敗は致命的（error.tsx に委ねる）が、
  // ラベル・未読数は付随情報のため失敗しても一覧表示は継続させる。3つとも並行実行する。
  const [mailPageResult, labelsResult, unreadCountsResult] = await Promise.allSettled([
    getMails("inbox"),
    getMailLabels(),
    getUnreadCounts(),
  ])
  if (mailPageResult.status === "rejected") {
    throw mailPageResult.reason
  }
  return {
    mailPage: mailPageResult.value,
    labels: withFallback("ラベル", labelsResult, []),
    unreadCounts: withFallback("未読数", unreadCountsResult, createEmptyUnreadCounts()),
  }
}

export async function fetchMailsAction(folder: MailFolder, label?: string, pageToken?: string): Promise<MailPage> {
  await requireAuth()
  return getMails(folder, label, pageToken)
}

export async function fetchMailBodyAction(id: string): Promise<Email | null> {
  await requireAuth()
  return getMailBody(id)
}

export async function toggleStarAction(id: string, starred: boolean): Promise<void> {
  await requireAuth()
  await toggleMailStar(id, starred)
}

export async function toggleArchiveAction(id: string, archived: boolean): Promise<void> {
  await requireAuth()
  await setMailArchived(id, archived)
}

export async function markAsReadAction(id: string): Promise<void> {
  await requireAuth()
  await markMailAsRead(id)
}

export async function fetchUnreadCountsAction(): Promise<Record<MailFolder, number>> {
  await requireAuth()
  return getUnreadCounts()
}
