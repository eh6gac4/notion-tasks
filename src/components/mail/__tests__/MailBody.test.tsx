import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MailBody } from '../MailBody';

describe('MailBody', () => {
  it('bodyHtml が無い場合はテキストを whitespace-pre-wrap で表示する', () => {
    render(<MailBody body={'Line 1\nLine 2'} />);
    expect(screen.getByText(/Line 1[\s\S]*Line 2/)).toBeInTheDocument();
    expect(screen.queryByTitle('メール本文')).not.toBeInTheDocument();
  });

  it('テキスト中の URL を <a> リンクに変換する', () => {
    render(<MailBody body={'See https://example.com for details'} />);
    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['', '_self', '_parent', '_top', 'mail-window', '_blank'])(
    'HTML 本文のリンクは元の target="%s" にかかわらず外部で開く',
    (target) => {
      render(<MailBody body="" bodyHtml={`<a href="https://example.com/path?a=1&amp;b=2" target="${target}" rel="nofollow opener">詳細</a>`} />);
      const doc = new DOMParser().parseFromString(screen.getByTitle('メール本文').getAttribute('srcdoc')!, 'text/html');
      const link = doc.querySelector('a')!;
      expect(link.getAttribute('href')).toBe('https://example.com/path?a=1&b=2');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('nofollow noopener noreferrer');
    },
  );

  it('画像マップのリンクも外部で開き、本文更新後も設定を維持する', () => {
    const { rerender } = render(<MailBody body="" bodyHtml='<map name="links"><area href="https://example.com" target="_self"></map>' />);
    const readDoc = () => new DOMParser().parseFromString(screen.getByTitle('メール本文').getAttribute('srcdoc')!, 'text/html');
    expect(readDoc().querySelector('area')?.getAttribute('target')).toBe('_blank');
    expect(readDoc().querySelector('area')?.getAttribute('rel')).toBe('noopener noreferrer');

    rerender(<MailBody body="" bodyHtml='<a href="https://example.org" target="_top">次のメール</a>' />);
    expect(readDoc().querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(readDoc().querySelector('a')?.getAttribute('href')).toBe('https://example.org');
  });

  it('bodyHtml がある場合は iframe sandbox で描画し、本文テキストは表示しない', () => {
    render(<MailBody body="plain fallback" bodyHtml="<p>Hello <b>World</b></p>" />);
    const iframe = screen.getByTitle('メール本文');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
    expect(iframe.getAttribute('srcdoc')).toContain('<p>Hello <b>World</b></p>');
    expect(screen.queryByText('plain fallback')).not.toBeInTheDocument();
  });

  it('外部画像はデフォルトで CSP によりブロックされ、ボタンで解除できる', () => {
    render(<MailBody body="" bodyHtml="<img src='https://evil.example/track.png'>" />);
    const iframeBefore = screen.getByTitle('メール本文');
    expect(iframeBefore.getAttribute('srcdoc')).toContain("img-src data:");
    expect(iframeBefore.getAttribute('srcdoc')).not.toContain('img-src https: data:');

    expect(screen.getByText('外部画像はブロックされています')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '画像を表示' }));
    expect(screen.getByTitle('メール本文').getAttribute('srcdoc')).toContain('img-src https: data:');
    expect(screen.getByTitle('メール本文')).toHaveAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
  });

  it('isLoading の場合はローディング表示のみ', () => {
    render(<MailBody body="snippet text" isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('snippet text')).not.toBeInTheDocument();
  });
});
