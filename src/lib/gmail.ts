import { Email, EmailSender, MailFolder, MailPage } from "@/types/mail"
import { config } from "@/config"
import { isDevMode } from "@/lib/require-auth"
import { INITIAL_MOCK_EMAILS, getFilteredEmails } from "@/lib/mockMailData"

// Gmail REST API を fetch で直叩きする。googleapis パッケージは Node 依存が重く
// Cloudflare Workers 上で動かないため使わない（src/lib/notion.ts と同様の方針）。
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

const LIST_MAX_RESULTS = 25
const LIST_BATCH_SIZE = 5
const LABEL_CACHE_TTL_MS = 5 * 60 * 1000

// システムラベル(id)。カスタムラベル抽出時に除外する。
const SYSTEM_LABEL_IDS = new Set([
  "INBOX", "SENT", "TRASH", "DRAFT", "SPAM", "STARRED", "UNREAD", "IMPORTANT", "CHAT",
  "CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS",
])

// ---- アクセストークン ----
// Workers の isolate は短命なため、モジュールスコープの変数キャッシュで十分。
// isolate が再利用される間は再取得を避け、期限切れ間際(30秒前)で更新する。
let cachedAccessToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      refresh_token: config.google.refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) {
    throw new Error(`[gmail] アクセストークン取得に失敗しました: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
  return cachedAccessToken.token
}

async function gmailGet<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const token = await getAccessToken()
  const url = new URL(`${GMAIL_API_BASE}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v))
      } else {
        url.searchParams.set(key, value)
      }
    }
  }
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new Error(`[gmail] API エラー (${path}): ${res.status} ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

async function gmailModify(path: string, body: unknown): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`[gmail] API エラー (${path}): ${res.status} ${await res.text()}`)
  }
}

async function fetchInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    results.push(...(await Promise.all(batch.map(fn))))
  }
  return results
}

// ---- フォルダ ⇔ Gmail 検索クエリ ----
function folderToQuery(folder: MailFolder): { q: string; includeSpamTrash: boolean } {
  switch (folder) {
    case "inbox":
      return { q: "label:INBOX", includeSpamTrash: false }
    case "starred":
      return { q: "label:STARRED", includeSpamTrash: false }
    case "sent":
      return { q: "label:SENT", includeSpamTrash: false }
    case "trash":
      // ゴミ箱は既定で検索対象外のため includeSpamTrash が必要
      return { q: "label:TRASH", includeSpamTrash: true }
    case "archive":
      return { q: "-label:INBOX -label:SENT -label:TRASH -label:SPAM", includeSpamTrash: false }
  }
}

// ---- ラベル(id ⇔ name)キャッシュ ----
interface GmailLabel {
  id: string
  name: string
  type: "system" | "user"
}

interface GmailLabelsCache {
  idToName: Map<string, string>
  customNames: string[]
  fetchedAt: number
}

let cachedLabels: GmailLabelsCache | null = null

async function getLabelsCache(): Promise<GmailLabelsCache> {
  const now = Date.now()
  if (cachedLabels && now - cachedLabels.fetchedAt < LABEL_CACHE_TTL_MS) {
    return cachedLabels
  }
  const data = await gmailGet<{ labels: GmailLabel[] }>("/labels")
  const idToName = new Map(data.labels.map((l) => [l.id, l.name]))
  const customNames = data.labels.filter((l) => l.type === "user").map((l) => l.name).sort()
  cachedLabels = { idToName, customNames, fetchedAt: now }
  return cachedLabels
}

function extractCustomLabels(labelIds: string[], idToName: Map<string, string>): string[] {
  return labelIds.filter((id) => !SYSTEM_LABEL_IDS.has(id)).map((id) => idToName.get(id) ?? id)
}

function deriveFolder(labelIds: string[]): MailFolder {
  if (labelIds.includes("TRASH")) return "trash"
  if (labelIds.includes("SENT")) return "sent"
  if (labelIds.includes("INBOX")) return "inbox"
  return "archive"
}

// ---- ヘッダ解析 ----
interface GmailHeader {
  name: string
  value: string
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

function parseSender(fromHeader: string): EmailSender {
  // "Alex Rivers <alex.rivers@notion.so>" または "alex.rivers@notion.so" の両方に対応
  const match = fromHeader.match(/^(.*?)\s*<(.+)>$/)
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "")
    return { name: name || match[2], email: match[2] }
  }
  return { name: fromHeader, email: fromHeader }
}

function parseRecipients(toHeader: string): string[] {
  if (!toHeader) return []
  return toHeader.split(",").map((r) => {
    const match = r.trim().match(/<(.+)>/)
    return match ? match[1] : r.trim()
  })
}

// ---- MIME 本文の抽出 ----
interface GmailMessagePart {
  mimeType: string
  body?: { data?: string; size?: number }
  parts?: GmailMessagePart[]
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder("utf-8").decode(bytes)
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function findBodyPart(part: GmailMessagePart, mimeType: string): GmailMessagePart | null {
  if (part.mimeType === mimeType && part.body?.data) return part
  if (part.parts) {
    for (const child of part.parts) {
      const found = findBodyPart(child, mimeType)
      if (found) return found
    }
  }
  return null
}

function extractBody(payload: GmailMessagePart): string {
  const plainPart = findBodyPart(payload, "text/plain")
  if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data)
  const htmlPart = findBodyPart(payload, "text/html")
  if (htmlPart?.body?.data) return stripHtml(decodeBase64Url(htmlPart.body.data))
  return ""
}

// ---- Gmail message → Email 変換 ----
interface GmailMessage {
  id: string
  snippet?: string
  labelIds?: string[]
  payload: GmailMessagePart & { headers: GmailHeader[] }
  internalDate?: string
}

function toEmail(message: GmailMessage, idToName: Map<string, string>, bodyOverride?: string): Email {
  const headers = message.payload.headers ?? []
  const labelIds = message.labelIds ?? []
  return {
    id: message.id,
    sender: parseSender(getHeader(headers, "From")),
    recipients: parseRecipients(getHeader(headers, "To")),
    subject: getHeader(headers, "Subject") || "(件名なし)",
    body: bodyOverride ?? message.snippet ?? "",
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date(getHeader(headers, "Date")).toISOString(),
    folder: deriveFolder(labelIds),
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    labels: extractCustomLabels(labelIds, idToName),
  }
}

// ---- 一覧・詳細取得 ----
async function fetchMailsFromGmail(folder: MailFolder, label?: string, pageToken?: string): Promise<MailPage> {
  const { q: folderQuery, includeSpamTrash } = folderToQuery(folder)
  const q = label ? `label:"${label}"` : folderQuery

  const [listData, labelsCache] = await Promise.all([
    gmailGet<{ messages?: { id: string }[]; nextPageToken?: string }>("/messages", {
      q,
      maxResults: String(LIST_MAX_RESULTS),
      includeSpamTrash: String(includeSpamTrash),
      ...(pageToken ? { pageToken } : {}),
    }),
    getLabelsCache(),
  ])

  const ids = listData.messages ?? []
  if (ids.length === 0) return { emails: [] }

  // messages.list は ID のみ返すため、ヘッダだけを 1 件ずつ取得する(本文は詳細表示時のみ)。
  // 25 件を無制限並列で取得すると Workers の同時接続数に影響しうるため、バッチ処理する。
  const messages = await fetchInBatches(ids, LIST_BATCH_SIZE, (item) =>
    gmailGet<GmailMessage>(`/messages/${item.id}`, {
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Date"],
    }),
  )

  return { emails: messages.map((m) => toEmail(m, labelsCache.idToName)), nextPageToken: listData.nextPageToken }
}

async function fetchMailBodyFromGmail(id: string): Promise<Email> {
  const [message, labelsCache] = await Promise.all([
    gmailGet<GmailMessage>(`/messages/${id}`, { format: "full" }),
    getLabelsCache(),
  ])
  return toEmail(message, labelsCache.idToName, extractBody(message.payload))
}

async function setStarredOnGmail(id: string, starred: boolean): Promise<void> {
  await gmailModify(`/messages/${id}/modify`, starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] })
}

async function markReadOnGmail(id: string): Promise<void> {
  await gmailModify(`/messages/${id}/modify`, { removeLabelIds: ["UNREAD"] })
}

// archive は複合クエリのため labels.get の対象にならない。0 固定とする。
const UNREAD_COUNT_FOLDERS: { folder: MailFolder; labelId: string }[] = [
  { folder: "inbox", labelId: "INBOX" },
  { folder: "starred", labelId: "STARRED" },
  { folder: "sent", labelId: "SENT" },
  { folder: "trash", labelId: "TRASH" },
]

async function fetchUnreadCountsFromGmail(): Promise<Record<MailFolder, number>> {
  const counts: Record<MailFolder, number> = { inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 }
  const results = await Promise.all(
    UNREAD_COUNT_FOLDERS.map(({ labelId }) => gmailGet<{ messagesUnread?: number }>(`/labels/${labelId}`)),
  )
  UNREAD_COUNT_FOLDERS.forEach(({ folder }, i) => {
    counts[folder] = results[i].messagesUnread ?? 0
  })
  return counts
}

// ---- 公開 API(dev モードでは mockMailData にフォールバック。src/lib/notion.ts と同じ方針) ----
export function getMails(folder: MailFolder, label?: string, pageToken?: string): Promise<MailPage> {
  if (isDevMode()) {
    const filtered = label
      ? INITIAL_MOCK_EMAILS.filter((e) => e.labels?.includes(label))
      : getFilteredEmails(INITIAL_MOCK_EMAILS, folder)
    return Promise.resolve({ emails: filtered })
  }
  return fetchMailsFromGmail(folder, label, pageToken)
}

export function getMailBody(id: string): Promise<Email | null> {
  if (isDevMode()) {
    return Promise.resolve(INITIAL_MOCK_EMAILS.find((e) => e.id === id) ?? null)
  }
  return fetchMailBodyFromGmail(id)
}

export async function toggleMailStar(id: string, starred: boolean): Promise<void> {
  if (isDevMode()) return
  await setStarredOnGmail(id, starred)
}

export async function markMailAsRead(id: string): Promise<void> {
  if (isDevMode()) return
  await markReadOnGmail(id)
}

export async function getMailLabels(): Promise<string[]> {
  if (isDevMode()) {
    const labelSet = new Set<string>()
    INITIAL_MOCK_EMAILS.forEach((e) => e.labels?.forEach((l) => labelSet.add(l)))
    return Array.from(labelSet).sort()
  }
  const { customNames } = await getLabelsCache()
  return customNames
}

export function getUnreadCounts(): Promise<Record<MailFolder, number>> {
  if (isDevMode()) {
    const counts: Record<MailFolder, number> = { inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 }
    INITIAL_MOCK_EMAILS.forEach((email) => {
      if (!email.isRead && email.folder !== "trash") {
        counts[email.folder] = (counts[email.folder] || 0) + 1
      }
    })
    return Promise.resolve(counts)
  }
  return fetchUnreadCountsFromGmail()
}
