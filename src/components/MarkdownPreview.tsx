import React from "react"
import { renderWithLinks } from "@/lib/linkify"

export function MarkdownPreview({ content, onToggleCheckbox }: { content: string; onToggleCheckbox?: (lineIndex: number) => void }) {
  const lines = content.split("\n")
  let inCode = false
  const codeLines: string[] = []
  const elements: React.ReactNode[] = []

  const flushCode = (key: number) => {
    elements.push(
      <pre
        key={key}
        className="rounded-none px-3 py-2 text-xs text-[var(--text)] font-mono overflow-x-auto my-1"
        style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
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
          className="my-2 max-w-full rounded-none"
          style={{ border: "1px solid var(--border)" }}
        />
      )
      return
    }

    if (line === "---") {
      elements.push(<hr key={i} className="my-2 border-[var(--border)]" />)
    } else if (line.startsWith("# ")) {
      elements.push(<p key={i} className="text-[var(--text)] text-base font-bold mt-2 mb-1">{renderWithLinks(line.slice(2))}</p>)
    } else if (line.startsWith("## ")) {
      elements.push(<p key={i} className="text-[var(--text)] text-sm font-semibold mt-2 mb-1">{renderWithLinks(line.slice(3))}</p>)
    } else if (line.startsWith("### ")) {
      elements.push(<p key={i} className="text-[var(--text-dim)] text-sm font-medium mt-1 mb-1">{renderWithLinks(line.slice(4))}</p>)
    } else if (/^- \[x\] /i.test(line)) {
      elements.push(
        <p key={i} className="text-[var(--text-dim)] text-sm line-through flex items-baseline gap-2">
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
        <p key={i} className="text-[var(--text)] text-sm flex items-baseline gap-2">
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
      elements.push(<p key={i} className="text-[var(--text)] text-sm"><span className="mr-2 text-[var(--accent)]">・</span>{renderWithLinks(line.slice(2))}</p>)
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)/)
      elements.push(<p key={i} className="text-[var(--text)] text-sm"><span className="mr-2 text-[var(--accent)]">{match?.[1]}.</span>{renderWithLinks(match?.[2] ?? "")}</p>)
    } else if (line.startsWith("> ")) {
      elements.push(
        <p key={i} className="text-[var(--text-dim)] text-sm pl-3 italic" style={{ borderLeft: "2px solid var(--border-accent)" }}>
          {renderWithLinks(line.slice(2))}
        </p>
      )
    } else if (line === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="text-[var(--text)] text-sm">{renderWithLinks(line)}</p>)
    }
  })

  if (inCode && codeLines.length > 0) flushCode(lines.length)

  return <div className="space-y-1">{elements}</div>
}
