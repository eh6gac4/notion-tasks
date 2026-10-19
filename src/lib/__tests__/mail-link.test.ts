import { describe, expect, it } from "vitest"
import { getTaskSourceLink } from "../mail-link"

describe("getTaskSourceLink", () => {
  it.each([
    "https://mail.google.com/mail/u/0/#inbox/18abcdef01234567",
    "https://mail.google.com/mail/u/1/#all/18abcdef01234567",
    "https://mail.google.com/mail/u/0/?view=pt&th=18abcdef01234567",
  ])("Gmail のメールリンクをアプリ内に向ける: %s", (url) => {
    expect(getTaskSourceLink(url)).toBe("/mail?messageId=18abcdef01234567")
  })

  it.each([
    "https://example.com/18abcdef01234567",
    "https://mail.google.com.evil.test/#inbox/18abcdef01234567",
    "https://mail.google.com/mail/u/0/#inbox",
    "https://mail.google.com/mail/u/0/#search/test",
    "invalid",
  ])("他のリンクは維持する: %s", (url) => {
    expect(getTaskSourceLink(url)).toBe(url)
  })
})
