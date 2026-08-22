import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  });

  it('isLoading の場合はローディング表示のみ', () => {
    render(<MailBody body="snippet text" isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('snippet text')).not.toBeInTheDocument();
  });
});
