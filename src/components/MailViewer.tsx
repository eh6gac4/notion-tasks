import React, { useState } from "react"
import { MarkdownPreview } from "./MarkdownPreview"

interface MailViewerProps {
  content: string
  onToggleCheckbox?: (lineIndex: number) => void
}

interface ParsedMail {
  headers: Record<string, string>
  body: string
}

function parseEmailContent(content: string): ParsedMail {
  const lines = content.split("\n")
  const headers: Record<string, string> = {}
  let bodyStartIndex = 0

  // 最初の数行にある "Key: Value" または "**Key:** Value" をパース
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 空行があったらヘッダー部分は終了とする
    if (line === "") {
      if (Object.keys(headers).length > 0) {
        bodyStartIndex = i + 1
        break
      } else {
        // ヘッダーが一つもないのに空行なら、いきなり本文とみなす
        bodyStartIndex = i
        break
      }
    }

    // Markdownの太字などを除去してパース
    const cleanLine = line.replace(/^\*\*(.+?)\*\*(?=:| )?:?/, "$1:") // "**From:**" -> "From:" 
                           .replace(/^\*(.+?)\*(?=:| )?:?/, "$1:")     // "*From:*" -> "From:"
    
    const match = cleanLine.match(/^([\w-]+|[^\x00-\x7F]+)\s*:\s*(.+)$/)
    if (match) {
      const key = match[1].toLowerCase()
      const value = match[2].trim()
      // 代表的なメールヘッダーキーかチェック
      if (["from", "to", "cc", "bcc", "date", "subject", "送信元", "宛先", "件名", "日付", "差出人"].includes(key)) {
        headers[key] = value
      } else {
        // 知らないキーなら本文の始まりかもしれないが、とりあえずヘッダーとして許容
        headers[key] = value
      }
    } else {
      // ヘッダーフォーマットに合わない行が来たら、そこから本文とする
      bodyStartIndex = i
      break
    }
  }

  const body = lines.slice(bodyStartIndex).join("\n")
  
  return { headers, body }
}

export function MailViewer({ content, onToggleCheckbox }: MailViewerProps) {
  const [viewMode, setViewMode] = useState<"mail" | "raw">("mail")
  const parsed = parseEmailContent(content)
  
  const from = parsed.headers["from"] || parsed.headers["差出人"] || parsed.headers["送信元"]
  const to = parsed.headers["to"] || parsed.headers["宛先"]
  const subject = parsed.headers["subject"] || parsed.headers["件名"]
  const date = parsed.headers["date"] || parsed.headers["日付"]
  
  // 明確なメールヘッダーが存在しない場合はそのままMarkdown表示
  const isEmailLike = !!from || !!subject || !!to

  if (!isEmailLike) {
    return <MarkdownPreview content={content} onToggleCheckbox={onToggleCheckbox} />
  }

  if (viewMode === "raw") {
    return (
      <div className="flex flex-col">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setViewMode("mail")}
            className="text-xs px-3 py-1 rounded-none bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            メール表示に戻す
          </button>
        </div>
        <MarkdownPreview content={content} onToggleCheckbox={onToggleCheckbox} />
      </div>
    )
  }

  // 差出人のイニシャル等をアイコンに
  const fromName = from ? from.split("<")[0].replace(/"/g, "").trim() : "Unknown"
  const initial = fromName ? fromName.charAt(0).toUpperCase() : "?"

  return (
    <div className="flex flex-col bg-[var(--bg-elevated)] border border-[var(--border)] rounded-none overflow-hidden shadow-none">
      {/* ツールバー */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="font-pixel text-[10px] text-[var(--text-faint)] uppercase tracking-wider">Mail Viewer</div>
        <button
          type="button"
          onClick={() => setViewMode("raw")}
          className="text-[10px] px-2 py-1 rounded-none border border-[var(--border-strong)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          ソースを見る
        </button>
      </div>
      
      {/* メールヘッダー */}
      <div className="p-4 border-b border-[var(--border-strong)]">
        <h3 className="text-lg font-bold text-[var(--text)] mb-4 leading-snug">
          {subject || "(件名なし)"}
        </h3>
        
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-none bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <div className="font-semibold text-sm text-[var(--text)] truncate">
                {fromName}
              </div>
              {date && (
                <div className="text-xs text-[var(--text-faint)] flex-shrink-0">
                  {date}
                </div>
              )}
            </div>
            <div className="text-xs text-[var(--text-dim)] truncate">
              {from && <span className="mr-3 text-opacity-80">From: {from}</span>}
            </div>
            {to && (
              <div className="text-xs text-[var(--text-dim)] truncate mt-0.5">
                To: {to}
              </div>
            )}
            
            {/* その他のヘッダー */}
            {Object.entries(parsed.headers).map(([k, v]) => {
              if (["from", "to", "subject", "date", "差出人", "送信元", "宛先", "件名", "日付"].includes(k)) return null
              return (
                <div key={k} className="text-[10px] text-[var(--text-faint)] truncate mt-0.5 capitalize">
                  {k}: {v}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* メール本文 */}
      <div className="p-5 bg-[var(--bg)] overflow-x-auto mail-body-content">
        <MarkdownPreview content={parsed.body} onToggleCheckbox={onToggleCheckbox} />
      </div>
    </div>
  )
}
