import React from "react"

// テキスト中の URL を <a> リンクに変換する。https?:// のみをマッチさせるため
// href に javascript: 等が入る余地はない。
export function renderWithLinks(text: string): React.ReactNode {
  const urlRegex = /https?:\/\/[^\s<>"']+/g
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const rawUrl = match[0]
    let url = rawUrl.replace(/[.,;:!?)\]'"。、！？」』）〉》]+$/, "")
    url = url.replace(/[　-〿＀-￯][　-〿぀-ヿ一-鿿豈-﫿＀-￯]*$/, "")
    url = url.replace(/((?:%[0-9A-Fa-f]{2})+)$/, (encoded) => {
      try {
        const decoded = decodeURIComponent(encoded)
        if (/^[　-〿＀-￯]/.test(decoded)) return ""
      } catch {}
      return encoded
    })
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer"
         className="text-[var(--accent)] underline break-all">
        {url}
      </a>
    )
    if (url.length < rawUrl.length) parts.push(rawUrl.slice(url.length))
    last = match.index + rawUrl.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : parts
}
