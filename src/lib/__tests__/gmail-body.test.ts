import { describe, expect, it, vi } from "vitest"

// gmail.ts は isDevMode() 経由で @/lib/require-auth → @/auth → next-auth を import 鎖で
// 引き込むが、next-auth はテスト環境で next/server の解決に失敗する
// (Cannot find module 'next/server')。TaskDetail.test.tsx 等と同じ「モジュール境界で
// モックする」方針に倣い、ここでは isDevMode の呼び出し元を経由しない純粋関数だけを
// テストするため、このモジュールをモックして import 鎖を断ち切る。
vi.mock("@/lib/require-auth", () => ({
  isDevMode: () => false,
}))

const { extractBodyParts, stripHtml } = await import("@/lib/gmail")

// Gmail API の body.data は base64url。テストデータ作成用ヘルパー。
const toBase64Url = (text: string): string =>
  Buffer.from(text, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

describe("stripHtml", () => {
  it("style/script を除去し、br/p を改行に変換する", () => {
    const html = "<style>p{color:red}</style><p>Hello<br>World</p><script>alert(1)</script>"
    expect(stripHtml(html)).toBe("Hello\nWorld")
  })

  it("実体参照をデコードする", () => {
    expect(stripHtml("A &amp; B &lt;tag&gt; &quot;q&quot; &#39;s&#39;&nbsp;end")).toBe('A & B <tag> "q" \'s\' end')
  })

  it("3連続以上の改行を圧縮する", () => {
    expect(stripHtml("<p>A</p><p>B</p><p></p><p>C</p>")).toBe("A\n\nB\n\nC")
  })
})

describe("extractBodyParts", () => {
  it("text/plain のみの場合は text だけ返す", () => {
    const payload = {
      mimeType: "text/plain",
      body: { data: toBase64Url("plain body") },
    }
    expect(extractBodyParts(payload)).toEqual({ text: "plain body", html: "" })
  })

  it("text/html のみの場合は html だけ返す", () => {
    const payload = {
      mimeType: "text/html",
      body: { data: toBase64Url("<p>html body</p>") },
    }
    expect(extractBodyParts(payload)).toEqual({ text: "", html: "<p>html body</p>" })
  })

  it("multipart で text/plain と text/html の両方を再帰的に取り出す", () => {
    const payload = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: toBase64Url("plain part") } },
        { mimeType: "text/html", body: { data: toBase64Url("<p>html part</p>") } },
      ],
    }
    expect(extractBodyParts(payload)).toEqual({ text: "plain part", html: "<p>html part</p>" })
  })

  it("本文が無ければ空文字を返す", () => {
    const payload = { mimeType: "multipart/mixed", parts: [] }
    expect(extractBodyParts(payload)).toEqual({ text: "", html: "" })
  })
})
