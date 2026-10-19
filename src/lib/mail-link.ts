// Gmail の従来形式のメール ID を、アプリ内の詳細リンクに変換する。
// 検索画面などメールを特定できない URL は元のまま残す。
export function getTaskSourceLink(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl)
    if (url.hostname !== "mail.google.com" || url.protocol !== "https:") return sourceUrl
    const id = url.searchParams.get("th") ?? url.hash.split("/").at(-1)
    if (!id || !/^[a-f0-9]{10,32}$/i.test(id)) return sourceUrl
    return `/mail?messageId=${encodeURIComponent(id)}`
  } catch {
    return sourceUrl
  }
}
