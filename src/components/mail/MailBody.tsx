'use client';

import React, { useCallback, useState } from 'react';
import { renderWithLinks } from '@/lib/linkify';
import { CyberLoader } from '@/components/CyberLoader';

export interface MailBodyProps {
  body: string;
  bodyHtml?: string;
  isLoading?: boolean;
}

// HTML メールを iframe sandbox に隔離して描画する。allow-same-origin/allow-scripts は
// 付けないため、埋め込まれたスクリプトは実行されず、親 DOM へのアクセスも不可能。
// 外部画像はデフォルトで CSP によりブロックし、ユーザーの明示操作で解除する
// (トラッキングピクセル対策)。
function buildSrcDoc(html: string, allowExternalImages: boolean): string {
  const imgSrc = allowExternalImages ? 'https: data:' : 'data:';
  const srcDoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${imgSrc}">
<base target="_blank">
<style>
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
    background: #fff;
    color: #1a1a1a;
  }
  img { max-width: 100%; height: auto; }
  a { color: #2563eb; }
  table { max-width: 100%; }
</style>
</head>
<body>${html}</body>
</html>`;

  // base の指定だけでは本文中の target="_self" 等を上書きできない。
  // iframe に渡す前に、すべてのリンクを外部で開く設定へ統一する。
  const doc = new DOMParser().parseFromString(srcDoc, 'text/html');
  doc.querySelectorAll('a[href], area[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    const rel = new Set((link.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
    rel.delete('opener');
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', [...rel].join(' '));
  });
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

export function MailBody({ body, bodyHtml, isLoading }: MailBodyProps) {
  const [showExternalImages, setShowExternalImages] = useState(false);

  // DOMParser はブラウザ API。サーバー描画中は呼ばず、iframe の設置時に使う。
  const setMailFrame = useCallback((frame: HTMLIFrameElement | null) => {
    if (frame && bodyHtml) {
      frame.srcdoc = buildSrcDoc(bodyHtml, showExternalImages);
    }
  }, [bodyHtml, showExternalImages]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <CyberLoader size="sm" />
      </div>
    );
  }

  if (bodyHtml) {
    return (
      <div className="flex flex-col min-h-0">
        {!showExternalImages && (
          <div className="flex items-center justify-between gap-4 px-6 py-2 bg-[var(--surface-2)] border-b border-[var(--border)] text-xs font-mono text-[var(--text-dim)]">
            <span>外部画像はブロックされています</span>
            <button
              type="button"
              onClick={() => setShowExternalImages(true)}
              className="px-2 py-1 border border-[var(--border-strong)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              画像を表示
            </button>
          </div>
        )}
        <iframe
          key={showExternalImages ? 'with-images' : 'no-images'}
          title="メール本文"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          ref={setMailFrame}
          className="w-full h-[60vh] md:h-[70vh] border-0"
        />
      </div>
    );
  }

  return (
    <div className="p-6 text-sm text-[var(--text)] font-sans leading-relaxed whitespace-pre-wrap">
      {renderWithLinks(body)}
    </div>
  );
}
