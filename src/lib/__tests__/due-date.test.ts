import { describe, it, expect } from "vitest"
import { parseDue, buildDue, formatDueShort } from "@/lib/due-date"

describe("parseDue", () => {
  it("null は { date: '', time: '' }", () => {
    expect(parseDue(null)).toEqual({ date: "", time: "" })
  })

  it("日付のみは date だけ埋まる", () => {
    expect(parseDue("2026-04-30")).toEqual({ date: "2026-04-30", time: "" })
  })

  it("日付+時刻は date と time に分解される（ローカル TZ）", () => {
    // テスト環境（vitest）は通常 UTC で実行されることがあるが、
    // オフセット付き ISO 文字列はローカル TZ で再解釈される
    const result = parseDue("2026-04-30T18:00:00.000+09:00")
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.time).toMatch(/^\d{2}:\d{2}$/)
  })

  it("不正な日付文字列は空に倒す", () => {
    expect(parseDue("Tnot-a-date")).toEqual({ date: "", time: "" })
  })
})

describe("buildDue", () => {
  it("date が空なら null", () => {
    expect(buildDue("", "")).toBeNull()
    expect(buildDue("", "12:00")).toBeNull()
  })

  it("date のみは日付文字列を返す", () => {
    expect(buildDue("2026-04-30", "")).toBe("2026-04-30")
  })

  it("date + time はオフセット付き ISO 文字列を返す", () => {
    const result = buildDue("2026-04-30", "18:00")
    expect(result).toMatch(/^2026-04-30T18:00:00\.000[+-]\d{2}:\d{2}$/)
  })
})

describe("parseDue ↔ buildDue ラウンドトリップ", () => {
  it("日付のみ", () => {
    const original = "2026-04-30"
    const { date, time } = parseDue(original)
    expect(buildDue(date, time)).toBe(original)
  })

  it("日付+時刻（ローカル TZ で意味同等）", () => {
    // ビルド時点のローカル TZ で構築 → 解析 → 再構築で同じ値に戻る
    const built = buildDue("2026-04-30", "18:00")
    expect(built).not.toBeNull()
    const { date, time } = parseDue(built!)
    expect(buildDue(date, time)).toBe(built)
  })
})

describe("formatDueShort", () => {
  it("日付のみは MM/DD", () => {
    expect(formatDueShort("2026-04-30")).toBe("04/30")
  })

  it("日付+時刻は MM/DD HH:mm", () => {
    // ローカル TZ で表示されるが、JST 環境では 18:00 になる
    const result = formatDueShort("2026-04-30T18:00:00.000+09:00")
    expect(result).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/)
  })

  it("不正な文字列はそのまま返す", () => {
    expect(formatDueShort("not-a-date-T")).toBe("not-a-date-T")
  })
})
