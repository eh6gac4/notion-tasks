import { describe, it, expect } from "vitest"
import { parseDue, buildDue, formatDueShort, snapTimeTo5Min, isOverdue } from "@/lib/due-date"

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

describe("snapTimeTo5Min", () => {
  it("空文字はそのまま", () => {
    expect(snapTimeTo5Min("")).toBe("")
  })

  it("既に 5 分刻みならそのまま", () => {
    expect(snapTimeTo5Min("12:00")).toBe("12:00")
    expect(snapTimeTo5Min("18:35")).toBe("18:35")
  })

  it("中間値は最寄りの 5 分に丸める", () => {
    expect(snapTimeTo5Min("12:32")).toBe("12:30") // 32 → 30
    expect(snapTimeTo5Min("12:33")).toBe("12:35") // 33 → 35
    expect(snapTimeTo5Min("18:03")).toBe("18:05")
    expect(snapTimeTo5Min("18:07")).toBe("18:05")
    expect(snapTimeTo5Min("18:08")).toBe("18:10")
  })

  it("23:58 など丸めると 24:00 になるケースは 23:55 に頭打ち", () => {
    expect(snapTimeTo5Min("23:58")).toBe("23:55")
    expect(snapTimeTo5Min("23:59")).toBe("23:55")
  })

  it("0 時台も正しく丸まる", () => {
    expect(snapTimeTo5Min("00:02")).toBe("00:00")
    expect(snapTimeTo5Min("00:03")).toBe("00:05")
  })

  it("不正な入力は空に倒す", () => {
    expect(snapTimeTo5Min("abc")).toBe("")
    expect(snapTimeTo5Min("25:00")).toBe("")
    expect(snapTimeTo5Min("12:99")).toBe("")
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

describe("isOverdue", () => {
  it("null は false", () => {
    expect(isOverdue(null)).toBe(false)
  })

  it("不正な文字列は false", () => {
    expect(isOverdue("not-a-date")).toBe(false)
  })

  it("過去日は true", () => {
    expect(isOverdue("2020-01-01")).toBe(true)
  })

  it("未来日は false", () => {
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const yyyy = future.getFullYear()
    const mm = String(future.getMonth() + 1).padStart(2, "0")
    const dd = String(future.getDate()).padStart(2, "0")
    expect(isOverdue(`${yyyy}-${mm}-${dd}`)).toBe(false)
  })

  it("当日（日付のみ）は false（その日が終わるまで overdue ではない）", () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    expect(isOverdue(`${yyyy}-${mm}-${dd}`)).toBe(false)
  })
})
