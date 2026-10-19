export function isRfc822MessageId(value: unknown): value is string {
  return typeof value === "string" && /^(?:<[^<>\s]+@[^<>\s]+>|[^<>\s]+@[^<>\s]+)$/.test(value)
}

// Gmail のメール ID と Message-ID 検索を、アプリ内の詳細リンクに変換する。
// 一般的な検索など、メールを特定できない URL は元のまま残す。
export function getTaskSourceLink(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl)
    if (url.hostname !== "mail.google.com" || url.protocol !== "https:") return sourceUrl
    if (url.hash.startsWith("#search/")) {
      const query = decodeURIComponent(url.hash.slice("#search/".length))
      const match = query.match(/^rfc822msgid:(.+)$/i)
      if (match && isRfc822MessageId(match[1])) {
        return `/mail?rfc822msgid=${encodeURIComponent(match[1])}`
      }
    }
    const id = url.searchParams.get("th") ?? url.hash.split("/").at(-1)
    if (!id || !/^[a-f0-9]{10,32}$/i.test(id)) return sourceUrl
    return `/mail?messageId=${encodeURIComponent(id)}`
  } catch {
    return sourceUrl
  }
}
