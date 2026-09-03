import { Email, EmailSender, MailFolder, MailPage } from "@/types/mail"
import { config } from "@/config"
import { isDevMode } from "@/lib/require-auth"
import { getGoogleRefreshToken } from "@/lib/token-store"
import { INITIAL_MOCK_EMAILS, getFilteredEmails, searchMockEmails } from "@/lib/mockMailData"
import {
  GMAIL_BATCH_URL,
  buildBatchBody,
  chunkSubRequests,
  extractBoundary,
  parseBatchResponse,
} from "@/lib/gmail-batch"

// Gmail REST API を fetch で直叩きする。googleapis パッケージは Node 依存が重く
// Cloudflare Workers 上で動かないため使わない（src/lib/notion.ts と同様の方針）。
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

const LIST_MAX_RESULTS = 25
// batch が使えない場合のフォールバック用。Workers の同時接続上限(6)に収まる幅にする。
const LIST_FALLBACK_BATCH_SIZE = 5
const LABEL_CACHE_TTL_MS = 5 * 60 * 1000
// 一覧に必要なヘッダのみを取る。batch 経路と逐次取得の両方でこの定義を使う。
const LIST_METADATA_PARAMS = {
  format: "metadata",
  metadataHeaders: ["From", "To", "Subject", "Date"],
} as const satisfies Record<string, string | string[]>
// 未読数は多少古くても支障が無いため、isolate 内で短期キャッシュして往復を減らす。
const UNREAD_COUNT_CACHE_TTL_MS = 30 * 1000

// システムラベル(id)。カスタムラベル抽出時に除外する。
const SYSTEM_LABEL_IDS = new Set([
  "INBOX", "SENT", "TRASH", "DRAFT", "SPAM", "STARRED", "UNREAD", "IMPORTANT", "CHAT",
  "CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS",
])

// refresh token 自体が失効・取り消し済みで、ユーザーによる Google 再認可でしか
// 復旧できない状態。一時的な API エラーとは区別してハンドリングできるようにする。
export class GmailReauthRequiredError extends Error {
  constructor(detail: string) {
    super(`[gmail] Google の再認可が必要です: ${detail}`)
    this.name = "GmailReauthRequiredError"
  }
}

// ---- アクセストークン ----
// Workers の isolate は短命なため、モジュールスコープの変数キャッシュで十分。
// isolate が再利用される間は再取得を避け、期限切れ間際(30秒前)で更新する。
let cachedAccessToken: { token: string; expiresAt: number } | null = null

/**
 * 与えられた refresh token でアクセストークンを 1 本取る。キャッシュには触らない。
 * 再認可(callback)が新しい refresh token を保存する前の疎通確認にも使うため、
 * 「保存済みトークンを読む」処理とは分けてある。
 */
export async function fetchAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 400 && body.includes("invalid_grant")) {
      throw new GmailReauthRequiredError(body)
    }
    throw new Error(`[gmail] アクセストークン取得に失敗しました: ${res.status} ${body}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  return { token: data.access_token, expiresIn: data.expires_in }
}

/**
 * refresh token が差し替わったときに呼ぶ。旧トークンで得たアクセストークンは
 * 最長 1 時間有効なままなので、明示的に捨てないと同じ isolate が再認可後も
 * 古い権限のトークンを使い続ける。
 */
export function clearAccessTokenCache(): void {
  cachedAccessToken = null
}

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token
  }
  const refreshToken = await getGoogleRefreshToken()
  const { token, expiresIn } = await fetchAccessToken(refreshToken)
  cachedAccessToken = { token, expiresAt: now + expiresIn * 1000 }
  return token
}

type GmailParams = Record<string, string | string[]>

// GET のクエリ文字列を組み立てる。単発取得と batch のサブリクエストで同じ表現を使うため、
// ここを唯一の組み立て箇所にする(片方だけパラメータを足す取りこぼしを防ぐ)。
function buildQuery(params?: GmailParams): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, v))
    } else {
      search.set(key, value)
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

async function gmailGet<T>(path: string, params?: GmailParams): Promise<T> {
  const token = await getAccessToken()
  const url = `${GMAIL_API_BASE}${path}${buildQuery(params)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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

interface GmailRequest {
  path: string
  params?: GmailParams
}

async function gmailBatchGet<T>(requests: GmailRequest[]): Promise<(T | null)[]> {
  const token = await getAccessToken()
  const chunks = chunkSubRequests(requests.map((r) => `${r.path}${buildQuery(r.params)}`))

  const chunkResults = await Promise.all(
    chunks.map(async (chunk) => {
      const boundary = `batch_${crypto.randomUUID()}`
      const res = await fetch(GMAIL_BATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/mixed; boundary=${boundary}`,
        },
        body: buildBatchBody(chunk, boundary),
      })
      if (!res.ok) throw new Error(`[gmail] batch エラー: ${res.status}`)

      const responseBoundary = extractBoundary(res.headers.get("content-type"))
      if (!responseBoundary) throw new Error("[gmail] batch レスポンスの boundary を特定できませんでした")

      const parts = parseBatchResponse<T>(await res.text(), responseBoundary, chunk.length)
      return parts.map((part) => (part.status >= 200 && part.status < 300 ? part.body : null))
    }),
  )
  return chunkResults.flat()
}

/**
 * 複数の GET をまとめて取得する。まず batch エンドポイントで 1 往復に集約し、
 * batch が使えない場合のみ従来どおり逐次取得へ退避する。
 * 退避の判断をここに閉じ込め、呼び出し側が batch を意識しないようにする。
 * 個々のリクエストが失敗した場合はその要素だけ null になる。
 */
async function gmailGetMany<T>(requests: GmailRequest[]): Promise<(T | null)[]> {
  if (requests.length === 0) return []
  try {
    return await gmailBatchGet<T>(requests)
  } catch (error) {
    // 原因が分からないまま遅い経路に落ち続けるのを避けるため、退避時は必ず記録する。
    console.warn("[gmail] batch 取得に失敗したため逐次取得に切り替えます", error)
    return fetchInBatches(requests, LIST_FALLBACK_BATCH_SIZE, async (request) => {
      try {
        return await gmailGet<T>(request.path, request.params)
      } catch {
        return null
      }
    })
  }
}

// ---- フォルダ ⇔ Gmail 検索クエリ ----
function folderToQuery(folder: MailFolder): { q: string; includeSpamTrash: boolean } {
  switch (folder) {
    case "all":
      // Gmail の「すべてのメール」相当。ゴミ箱・迷惑メールのみ除外する。
      return { q: "-label:TRASH -label:SPAM", includeSpamTrash: false }
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

export function stripHtml(html: string): string {
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

export interface MailBodyParts {
  text: string
  html: string
}

// text/plain と text/html の両方を取り出す。HTML があれば詳細画面はそちらを優先表示し、
// テキストは Taskify/AI Draft 等プレーンテキストが必要な用途のフォールバックに使う。
export function extractBodyParts(payload: GmailMessagePart): MailBodyParts {
  const plainPart = findBodyPart(payload, "text/plain")
  const text = plainPart?.body?.data ? decodeBase64Url(plainPart.body.data) : ""
  const htmlPart = findBodyPart(payload, "text/html")
  const html = htmlPart?.body?.data ? decodeBase64Url(htmlPart.body.data) : ""
  return { text, html }
}

// ---- Gmail message → Email 変換 ----
interface GmailMessage {
  id: string
  snippet?: string
  labelIds?: string[]
  payload: GmailMessagePart & { headers: GmailHeader[] }
  internalDate?: string
}

function toEmail(message: GmailMessage, idToName: Map<string, string>, bodyOverride?: MailBodyParts): Email {
  const headers = message.payload.headers ?? []
  const labelIds = message.labelIds ?? []
  // bodyOverride が無ければ一覧取得(本文は未取得)なので snippet を仮の body として使う。
  // ある場合は text/plain を優先し、無ければ text/html をテキスト化したものを使う。
  const plainText = bodyOverride ? bodyOverride.text || stripHtml(bodyOverride.html) : undefined
  return {
    id: message.id,
    sender: parseSender(getHeader(headers, "From")),
    recipients: parseRecipients(getHeader(headers, "To")),
    subject: getHeader(headers, "Subject") || "(件名なし)",
    body: plainText || message.snippet || "",
    bodyHtml: bodyOverride?.html || undefined,
    bodyLoaded: bodyOverride !== undefined,
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
// q は呼び出し側で組み立てる。フォルダ・ラベル・検索でクエリの作り方だけが違い、
// 以降の一覧取得(ID 一覧 → batch でヘッダ取得)は完全に共通のため。
async function fetchMailsFromGmail(q: string, includeSpamTrash: boolean, pageToken?: string): Promise<MailPage> {
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

  // messages.list は ID のみ返すため、ヘッダの取得が別途必要になる(本文は詳細表示時のみ)。
  // 1 件ずつ叩くと往復回数がそのままレイテンシになるので batch で 1 往復にまとめる。
  const fetched = await gmailGetMany<GmailMessage>(
    ids.map((item) => ({ path: `/messages/${item.id}`, params: LIST_METADATA_PARAMS })),
  )
  const messages = fetched.filter((m): m is GmailMessage => m !== null)

  return { emails: messages.map((m) => toEmail(m, labelsCache.idToName)), nextPageToken: listData.nextPageToken }
}

async function fetchMailBodyFromGmail(id: string): Promise<Email> {
  const [message, labelsCache] = await Promise.all([
    gmailGet<GmailMessage>(`/messages/${id}`, { format: "full" }),
    getLabelsCache(),
  ])
  return toEmail(message, labelsCache.idToName, extractBodyParts(message.payload))
}

async function setStarredOnGmail(id: string, starred: boolean): Promise<void> {
  await gmailModify(`/messages/${id}/modify`, starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] })
}

async function markReadOnGmail(id: string): Promise<void> {
  await gmailModify(`/messages/${id}/modify`, { removeLabelIds: ["UNREAD"] })
}

// Gmail のアーカイブは INBOX ラベルの付け外しで表現される(専用の API は無い)。
async function setArchivedOnGmail(id: string, archived: boolean): Promise<void> {
  await gmailModify(`/messages/${id}/modify`, archived ? { removeLabelIds: ["INBOX"] } : { addLabelIds: ["INBOX"] })
}

// archive・all は複合クエリのため labels.get の対象にならない。0 固定とする。
const UNREAD_COUNT_FOLDERS: { folder: MailFolder; labelId: string }[] = [
  { folder: "inbox", labelId: "INBOX" },
  { folder: "starred", labelId: "STARRED" },
  { folder: "sent", labelId: "SENT" },
  { folder: "trash", labelId: "TRASH" },
]

export function createEmptyUnreadCounts(): Record<MailFolder, number> {
  return { all: 0, inbox: 0, starred: 0, sent: 0, archive: 0, trash: 0 }
}

let cachedUnreadCounts: { counts: Record<MailFolder, number>; fetchedAt: number } | null = null

// 未読数を変化させる操作の後に呼ぶ。どの操作が未読数に影響するかを
// 呼び出し側で明示できるよう、モジュール変数の直接操作にはしない。
function invalidateUnreadCounts(): void {
  cachedUnreadCounts = null
}

async function fetchUnreadCountsFromGmail(): Promise<Record<MailFolder, number>> {
  const now = Date.now()
  if (cachedUnreadCounts && now - cachedUnreadCounts.fetchedAt < UNREAD_COUNT_CACHE_TTL_MS) {
    return cachedUnreadCounts.counts
  }

  const counts = createEmptyUnreadCounts()
  const results = await gmailGetMany<{ messagesUnread?: number }>(
    UNREAD_COUNT_FOLDERS.map(({ labelId }) => ({ path: `/labels/${labelId}` })),
  )

  UNREAD_COUNT_FOLDERS.forEach(({ folder }, i) => {
    counts[folder] = results[i]?.messagesUnread ?? 0
  })
  cachedUnreadCounts = { counts, fetchedAt: now }
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
  const { q, includeSpamTrash } = folderToQuery(folder)
  return fetchMailsFromGmail(label ? `label:"${label}"` : q, includeSpamTrash, pageToken)
}

// フォルダ横断の全文検索。一覧の body は snippet(本文冒頭)しか持たないため、
// クライアント側の絞り込みでは本文中間や未読み込みのメールに到達できない。
export function searchMails(query: string, pageToken?: string): Promise<MailPage> {
  const trimmed = query.trim()
  if (!trimmed) return Promise.resolve({ emails: [] })
  if (isDevMode()) return Promise.resolve({ emails: searchMockEmails(trimmed) })

  // フォルダ・ラベルでは絞らず全メールを対象にする。ゴミ箱・迷惑メールは
  // includeSpamTrash=false で除外されるため、クエリ側の除外指定は要らない。
  // 検索語はエスケープしない。from:/subject:/has:attachment 等の演算子を
  // そのまま Gmail に解釈させるのが狙いのため。
  return fetchMailsFromGmail(trimmed, false, pageToken)
}

export function getMailBody(id: string): Promise<Email | null> {
  if (isDevMode()) {
    const mock = INITIAL_MOCK_EMAILS.find((e) => e.id === id)
    return Promise.resolve(mock ? { ...mock, bodyLoaded: true } : null)
  }
  return fetchMailBodyFromGmail(id)
}

export async function toggleMailStar(id: string, starred: boolean): Promise<void> {
  if (isDevMode()) return
  await setStarredOnGmail(id, starred)
}

export async function setMailArchived(id: string, archived: boolean): Promise<void> {
  if (isDevMode()) return
  await setArchivedOnGmail(id, archived)
  // 未読メールの移動で INBOX の未読数が変わるため。
  invalidateUnreadCounts()
}

export async function markMailAsRead(id: string): Promise<void> {
  if (isDevMode()) return
  await markReadOnGmail(id)
  invalidateUnreadCounts()
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
    const counts = createEmptyUnreadCounts()
    INITIAL_MOCK_EMAILS.forEach((email) => {
      if (!email.isRead && email.folder !== "trash") {
        counts[email.folder] = (counts[email.folder] || 0) + 1
      }
    })
    // all はゴミ箱以外の未読合計。starred は inbox/sent/archive のいずれかと重複カウントされるため除外する。
    counts.all = counts.inbox + counts.sent + counts.archive
    return Promise.resolve(counts)
  }
  return fetchUnreadCountsFromGmail()
}
