import { describe, expect, it } from "vitest"
import { getTaskSourceLink, isRfc822MessageId } from "../mail-link"

describe("getTaskSourceLink", () => {
  it.each([
    "https://mail.google.com/mail/u/0/#inbox/18abcdef01234567",
    "https://mail.google.com/mail/u/1/#all/18abcdef01234567",
    "https://mail.google.com/mail/u/0/?view=pt&th=18abcdef01234567",
  ])("Gmail のメールリンクをアプリ内に向ける: %s", (url) => {
    expect(getTaskSourceLink(url)).toBe("/mail?messageId=18abcdef01234567")
  })

  it("Message-ID 検索リンクをアプリ内に向ける", () => {
    const id = "<0.1.2C.755.1DD5536BD8F4E68.0@omp.mail.tokyu-rec.co.jp>"
    const url = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(id)}`
    expect(getTaskSourceLink(url)).toBe(`/mail?rfc822msgid=${encodeURIComponent(id)}`)
  })

  it.each([
    "https://mail.google.com/mail/u/1/#search/rfc822msgid%3A%3Ctest%2Btag%40example.com%3E",
    "https://mail.google.com/mail/u/0/#search/rfc822msgid:<test+tag@example.com>",
  ])("検索式全体のエンコードや + を保持する: %s", (url) => {
    expect(getTaskSourceLink(url)).toBe(`/mail?rfc822msgid=${encodeURIComponent('<test+tag@example.com>')}`)
  })

  it.each([
    "https://example.com/18abcdef01234567",
    "https://mail.google.com.evil.test/#inbox/18abcdef01234567",
    "https://mail.google.com/mail/u/0/#inbox",
    "https://mail.google.com/mail/u/0/#search/test",
    "https://mail.google.com/mail/u/0/#search/rfc822msgid:%ZZ",
    "https://mail.google.com/mail/u/0/#search/rfc822msgid:%3Ctest%40example.com%3E%20OR%20is:unread",
    "invalid",
  ])("他のリンクは維持する: %s", (url) => {
    expect(getTaskSourceLink(url)).toBe(url)
  })
})

describe("isRfc822MessageId", () => {
  it.each(["<test@example.com>", "test@example.com", "<test+tag@example.com>"])("Message-IDを認識する: %s", (id) => {
    expect(isRfc822MessageId(id)).toBe(true)
  })
  it.each([undefined, [], "", "test", "<test@example.com", "test@example.com>", "test@example.com OR is:unread"])("不正な値を拒否する: %s", (id) => {
    expect(isRfc822MessageId(id)).toBe(false)
  })
})
