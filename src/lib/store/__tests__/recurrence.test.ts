// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  describeRule,
  isDateKey,
  matchesRule,
  nextOccurrences,
  occurrencesInRange,
  shiftDateKey,
  validateRule,
} from "@/lib/recurrence"
import type { RecurrenceRule } from "@/types/recurring"

function rule(partial: Partial<RecurrenceRule> & Pick<RecurrenceRule, "freq" | "startDate">): RecurrenceRule {
  return {
    interval: 1,
    byweekday: null,
    bymonthday: null,
    bymonth: null,
    endDate: null,
    ...partial,
  }
}

describe("isDateKey", () => {
  it("存在しない日付を弾く", () => {
    expect(isDateKey("2026-09-01")).toBe(true)
    expect(isDateKey("2026-02-30")).toBe(false)
    expect(isDateKey("2026-13-01")).toBe(false)
    expect(isDateKey("2026-9-1")).toBe(false)
  })

  it("うるう年の 2/29 を通す", () => {
    expect(isDateKey("2028-02-29")).toBe(true)
    expect(isDateKey("2026-02-29")).toBe(false)
  })
})

describe("shiftDateKey", () => {
  it("月と年を跨いでも正しくずれる", () => {
    expect(shiftDateKey("2026-08-31", 1)).toBe("2026-09-01")
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31")
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28")
  })
})

describe("occurrencesInRange: daily", () => {
  it("毎日は全日を返す", () => {
    const r = rule({ freq: "daily", startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-04")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ])
  })

  it("3 日ごとは start_date を基準に飛ぶ", () => {
    const r = rule({ freq: "daily", interval: 3, startDate: "2026-09-02" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-10")).toEqual([
      "2026-09-02",
      "2026-09-05",
      "2026-09-08",
    ])
  })

  it("start_date より前は返さない", () => {
    const r = rule({ freq: "daily", startDate: "2026-09-05" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-06")).toEqual(["2026-09-05", "2026-09-06"])
  })

  it("end_date を含んでそこで止まる", () => {
    const r = rule({ freq: "daily", startDate: "2026-09-01", endDate: "2026-09-03" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-10")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ])
  })
})

describe("occurrencesInRange: weekly", () => {
  it("毎週 月・金 を返す (2026-09-01 は火曜)", () => {
    const r = rule({ freq: "weekly", byweekday: [1, 5], startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-14")).toEqual([
      "2026-09-04", // 金
      "2026-09-07", // 月
      "2026-09-11", // 金
      "2026-09-14", // 月
    ])
  })

  it("曜日未指定なら start_date の曜日になる", () => {
    const r = rule({ freq: "weekly", startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-09-16")).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ])
  })

  it("隔週は start_date を含む週を 0 週目として偶数週だけ拾う", () => {
    const r = rule({ freq: "weekly", interval: 2, byweekday: [3], startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-10-01")).toEqual([
      "2026-09-02", // start と同じ週の水曜
      "2026-09-16",
      "2026-09-30",
    ])
  })
})

describe("occurrencesInRange: monthly", () => {
  it("毎月 15 日", () => {
    const r = rule({ freq: "monthly", bymonthday: 15, startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-12-31")).toEqual([
      "2026-09-15",
      "2026-10-15",
      "2026-11-15",
      "2026-12-15",
    ])
  })

  it("日を指定しなければ start_date の日を使う", () => {
    const r = rule({ freq: "monthly", startDate: "2026-09-10" })
    expect(occurrencesInRange(r, "2026-09-01", "2026-11-30")).toEqual([
      "2026-09-10",
      "2026-10-10",
      "2026-11-10",
    ])
  })

  it("31 日は存在しない月をスキップする (月末に丸めない)", () => {
    const r = rule({ freq: "monthly", bymonthday: 31, startDate: "2026-01-01" })
    expect(occurrencesInRange(r, "2026-01-01", "2026-06-30")).toEqual([
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
    ])
  })

  it("2 か月ごとは start_date の月を基準にする", () => {
    const r = rule({ freq: "monthly", interval: 2, bymonthday: 1, startDate: "2026-09-01" })
    expect(occurrencesInRange(r, "2026-09-01", "2027-02-28")).toEqual([
      "2026-09-01",
      "2026-11-01",
      "2027-01-01",
    ])
  })
})

describe("occurrencesInRange: yearly", () => {
  it("毎年 4/1", () => {
    const r = rule({ freq: "yearly", bymonth: 4, bymonthday: 1, startDate: "2026-01-01" })
    expect(occurrencesInRange(r, "2026-01-01", "2028-12-31")).toEqual([
      "2026-04-01",
      "2027-04-01",
      "2028-04-01",
    ])
  })

  it("月日を指定しなければ start_date の月日を使う", () => {
    const r = rule({ freq: "yearly", startDate: "2026-06-20" })
    expect(occurrencesInRange(r, "2026-01-01", "2028-12-31")).toEqual([
      "2026-06-20",
      "2027-06-20",
      "2028-06-20",
    ])
  })

  it("2/29 はうるう年だけ発生する", () => {
    const r = rule({ freq: "yearly", bymonth: 2, bymonthday: 29, startDate: "2024-01-01" })
    expect(occurrencesInRange(r, "2024-01-01", "2032-12-31")).toEqual([
      "2024-02-29",
      "2028-02-29",
      "2032-02-29",
    ])
  })
})

describe("matchesRule", () => {
  it("範囲外の日付は false", () => {
    const r = rule({ freq: "daily", startDate: "2026-09-05", endDate: "2026-09-10" })
    expect(matchesRule(r, "2026-09-04")).toBe(false)
    expect(matchesRule(r, "2026-09-05")).toBe(true)
    expect(matchesRule(r, "2026-09-10")).toBe(true)
    expect(matchesRule(r, "2026-09-11")).toBe(false)
  })
})

describe("nextOccurrences", () => {
  it("毎年でも先の回まで辿れる", () => {
    const r = rule({ freq: "yearly", bymonth: 4, bymonthday: 1, startDate: "2026-01-01" })
    expect(nextOccurrences(r, "2026-05-01", 3)).toEqual(["2027-04-01", "2028-04-01", "2029-04-01"])
  })

  it("end_date を過ぎていれば空", () => {
    const r = rule({ freq: "daily", startDate: "2026-01-01", endDate: "2026-01-31" })
    expect(nextOccurrences(r, "2026-02-01", 3)).toEqual([])
  })
})

describe("validateRule", () => {
  it("妥当なルールはエラーなし", () => {
    expect(validateRule(rule({ freq: "weekly", byweekday: [1], startDate: "2026-09-01" }))).toEqual([])
  })

  it("weekly 以外の byweekday を弾く", () => {
    const errors = validateRule(rule({ freq: "daily", byweekday: [1], startDate: "2026-09-01" }))
    expect(errors.some((e) => e.includes("byweekday"))).toBe(true)
  })

  it("interval が 0 以下ならエラー", () => {
    const errors = validateRule(rule({ freq: "daily", interval: 0, startDate: "2026-09-01" }))
    expect(errors.some((e) => e.includes("interval"))).toBe(true)
  })

  it("end_date が start_date より前ならエラー", () => {
    const errors = validateRule(rule({ freq: "daily", startDate: "2026-09-10", endDate: "2026-09-01" }))
    expect(errors.some((e) => e.includes("end_date"))).toBe(true)
  })

  it("一度も発生しないルールを弾く", () => {
    // 2 月 30 日は永遠に来ない
    const errors = validateRule(rule({ freq: "yearly", bymonth: 2, bymonthday: 30, startDate: "2026-01-01" }))
    expect(errors).toContain("この条件では発生日が一度もありません")
  })

  it("start_date の形式違いを弾く", () => {
    const errors = validateRule(rule({ freq: "daily", startDate: "2026/09/01" }))
    expect(errors.some((e) => e.includes("start_date"))).toBe(true)
  })
})

describe("describeRule", () => {
  it("日本語 1 行に要約する", () => {
    expect(describeRule(rule({ freq: "daily", startDate: "2026-09-01" }))).toBe("毎日")
    expect(describeRule(rule({ freq: "daily", interval: 3, startDate: "2026-09-01" }))).toBe("3 日ごと")
    expect(describeRule(rule({ freq: "weekly", byweekday: [1, 5], startDate: "2026-09-01" }))).toBe(
      "毎週 月・金曜",
    )
    expect(describeRule(rule({ freq: "monthly", bymonthday: 15, startDate: "2026-09-01" }))).toBe("毎月 15 日")
    expect(describeRule(rule({ freq: "yearly", bymonth: 4, bymonthday: 1, startDate: "2026-01-01" }))).toBe(
      "毎年 4 月 1 日",
    )
  })
})
