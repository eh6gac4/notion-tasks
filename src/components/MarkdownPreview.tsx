import React from "react"

function renderWithLinks(text: string): React.ReactNode {
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
         className="text-[#ff00cc] underline break-all">
        {url}
      </a>
    )
    if (url.length < rawUrl.length) parts.push(rawUrl.slice(url.length))
    last = match.index + rawUrl.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : parts
}

export function MarkdownPreview({ content, onToggleCheckbox }: { content: string; onToggleCheckbox?: (lineIndex: number) => void }) {
  const lines = content.split("\n")
  let inCode = false
  const codeLines: string[] = []
  const elements: React.ReactNode[] = []

  const flushCode = (key: number) => {
    elements.push(
      <pre
        key={key}
        className="rounded-lg px-3 py-2 text-xs text-[#ffbbee] font-mono overflow-x-auto my-1"
        style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,0,204,0.15)" }}
      >
        {codeLines.join("\n")}
      </pre>
    )
    codeLines.length = 0
  }

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode(i)
        inCode = false
      } else {
        inCode = true
      }
      return
    }
    if (inCode) {
      codeLines.push(line)
      return
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\((.+)\)$/)
    if (imgMatch) {
      const [, alt, src] = imgMatch
      elements.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt={alt}
          className="my-2 max-w-full rounded-lg"
          style={{ border: "1px solid rgba(255,0,204,0.2)" }}
        />
      )
      return
    }

    if (line === "---") {
      elements.push(<hr key={i} className="my-2 border-[rgba(255,0,204,0.2)]" />)
    } else if (line.startsWith("# ")) {
      elements.push(<p key={i} className="text-[#ffbbee] text-base font-bold mt-2 mb-1">{renderWithLinks(line.slice(2))}</p>)
    } else if (line.startsWith("## ")) {
      elements.push(<p key={i} className="text-[#ffbbee] text-sm font-semibold mt-2 mb-1">{renderWithLinks(line.slice(3))}</p>)
    } else if (line.startsWith("### ")) {
      elements.push(<p key={i} className="text-[#cc99bb] text-sm font-medium mt-1 mb-1">{renderWithLinks(line.slice(4))}</p>)
    } else if (/^- \[x\] /i.test(line)) {
      elements.push(
        <p key={i} className="text-[#996688] text-sm line-through flex items-baseline gap-2">
          <button
            type="button"
            onClick={() => onToggleCheckbox?.(i)}
            className="not-italic flex-shrink-0 hover:opacity-70 transition-opacity active:scale-90"
            aria-label="チェックを外す"
          >☑</button>
          <span>{renderWithLinks(line.slice(6))}</span>
        </p>
      )
    } else if (/^- \[ \] /.test(line)) {
      elements.push(
        <p key={i} className="text-[#cc99bb] text-sm flex items-baseline gap-2">
          <button
            type="button"
            onClick={() => onToggleCheckbox?.(i)}
            className="flex-shrink-0 hover:opacity-70 transition-opacity active:scale-90"
            aria-label="チェックする"
          >☐</button>
          <span>{renderWithLinks(line.slice(6))}</span>
        </p>
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<p key={i} className="text-[#cc99bb] text-sm"><span className="mr-2 text-[#ff00cc]">・</span>{renderWithLinks(line.slice(2))}</p>)
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)/)
      elements.push(<p key={i} className="text-[#cc99bb] text-sm"><span className="mr-2 text-[#ff00cc]">{match?.[1]}.</span>{renderWithLinks(match?.[2] ?? "")}</p>)
    } else if (line.startsWith("> ")) {
      elements.push(
        <p key={i} className="text-[#996688] text-sm pl-3 italic" style={{ borderLeft: "2px solid rgba(255,0,204,0.4)" }}>
          {renderWithLinks(line.slice(2))}
        </p>
      )
    } else if (line === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="text-[#cc99bb] text-sm">{renderWithLinks(line)}</p>)
    }
  })

  if (inCode && codeLines.length > 0) flushCode(lines.length)

  return <div className="space-y-1">{elements}</div>
}
