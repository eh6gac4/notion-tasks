// 繰り返しルールから発生日 (YYYY-MM-DD) を導く純関数群。
//
// D1 にもブラウザ API にも依存しない。Worker (UTC) とブラウザ (JST) の
// どちらで動かしても同じ結果になるよう、日付は常に「UTC の正午」に固定した
// Date で扱い、入出力は YYYY-MM-DD 文字列に統一する。正午に置くのは、
// 前後 12 時間のズレが生じても日付が跨がないようにするため。

import type { RecurrenceFrequency, RecurrenceRule } from "@/types/recurring"

const DAY_MS = 86_400_000
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const

export function isDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  // 2026-02-30 のような「形式は合うが存在しない日」を弾く
  return toKey(parseDateKey(value)) === value
}

export function isTimeKey(value: string): boolean {
  return TIME_RE.test(value)
}

/** YYYY-MM-DD → UTC 正午の Date */
function parseDateKey(value: string): Date {
  const m = DATE_RE.exec(value)
  if (!m) return new Date(Number.NaN)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
}

/** UTC 正午の Date → YYYY-MM-DD */
function toKey(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, "0")
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS)
}

/** 日曜始まりの通し週番号。週の間隔判定に使う */
function weekIndex(d: Date): number {
  const epochDays = Math.floor(d.getTime() / DAY_MS)
  return Math.floor((epochDays - d.getUTCDay()) / 7)
}

/** 指定日から n 日ずらした YYYY-MM-DD を返す。UI と Worker の双方から使う */
export function shiftDateKey(dateKey: string, days: number): string {
  return toKey(addDays(parseDateKey(dateKey), days))
}

/** ブラウザのローカル日付。フォームの初期値と一覧のプレビュー基準に使う */
export function todayLocal(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/**
 * 日本時間での「今日」。Worker は UTC で動くため、サーバ側の日付は必ずこれを通す。
 * en-CA ロケールは YYYY-MM-DD 形式を返すのでそのまま使える。
 */
export function todayInTokyo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/**
 * その日が rule の発生日かどうか。
 *
 * interval の基準は常に startDate。「隔週の月・金」なら startDate を含む週を
 * 0 週目として、偶数週の月曜と金曜だけが発生日になる。
 */
export function matchesRule(rule: RecurrenceRule, dateKey: string): boolean {
  const date = parseDateKey(dateKey)
  const start = parseDateKey(rule.startDate)
  if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime())) return false
  if (date < start) return false
  if (rule.endDate && dateKey > rule.endDate) return false

  const interval = Math.max(1, Math.trunc(rule.interval))

  switch (rule.freq) {
    case "daily":
      return daysBetween(date, start) % interval === 0

    case "weekly": {
      if ((weekIndex(date) - weekIndex(start)) % interval !== 0) return false
      const days = rule.byweekday?.length ? rule.byweekday : [start.getUTCDay()]
      return days.includes(date.getUTCDay())
    }

    case "monthly": {
      const months =
        (date.getUTCFullYear() - start.getUTCFullYear()) * 12 + (date.getUTCMonth() - start.getUTCMonth())
      if (months % interval !== 0) return false
      // bymonthday が月の日数を超える月 (2 月の 31 日など) はどの日にも一致せず、
      // 結果としてその月がまるごとスキップされる。月末への丸めは行わない。
      return date.getUTCDate() === (rule.bymonthday ?? start.getUTCDate())
    }

    case "yearly": {
      if ((date.getUTCFullYear() - start.getUTCFullYear()) % interval !== 0) return false
      if (date.getUTCMonth() + 1 !== (rule.bymonth ?? start.getUTCMonth() + 1)) return false
      return date.getUTCDate() === (rule.bymonthday ?? start.getUTCDate())
    }
  }
}

/**
 * from 〜 to (両端を含む) の発生日を昇順で返す。
 * cron は数十日ぶんしか見ないため、日単位の総当たりで十分速い。
 *
 * `limit` を渡すとその件数で打ち切る。プレビューのように先頭数件しか要らない
 * 用途で、残りの範囲を走査する無駄を避けるため。
 */
export function occurrencesInRange(
  rule: RecurrenceRule,
  from: string,
  to: string,
  limit = Infinity,
): string[] {
  if (limit < 1 || !isDateKey(from) || !isDateKey(to) || from > to) return []

  // startDate より前は走査しても無駄なので開始位置を寄せる
  const begin = from < rule.startDate ? rule.startDate : from
  const last = rule.endDate && rule.endDate < to ? rule.endDate : to
  if (!isDateKey(begin) || begin > last) return []

  const out: string[] = []
  for (let d = parseDateKey(begin); ; d = addDays(d, 1)) {
    const key = toKey(d)
    if (key > last) break
    if (matchesRule(rule, key)) {
      out.push(key)
      if (out.length >= limit) break
    }
  }
  return out
}

/**
 * from 以降の発生日を最大 count 件返す。ルール登録時のプレビュー用。
 * 走査上限を設けているのは、条件次第で永遠に一致しないルール
 * (毎年 2 月 30 日など) で無限ループしないため。
 */
export function nextOccurrences(rule: RecurrenceRule, from: string, count = 3): string[] {
  const interval = Math.max(1, Math.trunc(rule.interval))
  // count 件ぶん確実に含まれる長さ。yearly/monthly は 1 件あたりの間隔が長い。
  const perOccurrence = rule.freq === "yearly" ? 366 * interval : rule.freq === "monthly" ? 31 * interval : 0
  const span = perOccurrence > 0 ? perOccurrence * count + 31 : 400
  return occurrencesInRange(rule, from, shiftDateKey(from, span), count)
}

/**
 * ルールの整合性チェック。問題があれば日本語のメッセージ配列を返す。
 * フォーム・一括投入スクリプトの双方から使う。
 */
export function validateRule(rule: RecurrenceRule): string[] {
  const errors: string[] = []
  const freqs: RecurrenceFrequency[] = ["daily", "weekly", "monthly", "yearly"]

  if (!freqs.includes(rule.freq)) errors.push(`freq が不正です: ${rule.freq}`)
  if (!Number.isInteger(rule.interval) || rule.interval < 1) errors.push(`interval は 1 以上の整数にしてください: ${rule.interval}`)
  if (!isDateKey(rule.startDate)) errors.push(`start_date が YYYY-MM-DD 形式ではありません: ${rule.startDate}`)
  if (rule.endDate !== null && !isDateKey(rule.endDate)) errors.push(`end_date が YYYY-MM-DD 形式ではありません: ${rule.endDate}`)
  if (rule.endDate && isDateKey(rule.startDate) && rule.endDate < rule.startDate) {
    errors.push("end_date が start_date より前です")
  }

  if (rule.byweekday?.length) {
    if (rule.freq !== "weekly") errors.push("byweekday は freq=weekly のときだけ指定できます")
    if (rule.byweekday.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      errors.push(`byweekday は 0(日) 〜 6(土) で指定してください: ${rule.byweekday.join(",")}`)
    }
  }

  if (rule.bymonthday !== null) {
    if (rule.freq !== "monthly" && rule.freq !== "yearly") {
      errors.push("bymonthday は freq=monthly / yearly のときだけ指定できます")
    }
    if (!Number.isInteger(rule.bymonthday) || rule.bymonthday < 1 || rule.bymonthday > 31) {
      errors.push(`bymonthday は 1 〜 31 で指定してください: ${rule.bymonthday}`)
    }
  }

  if (rule.bymonth !== null) {
    if (rule.freq !== "yearly") errors.push("bymonth は freq=yearly のときだけ指定できます")
    if (!Number.isInteger(rule.bymonth) || rule.bymonth < 1 || rule.bymonth > 12) {
      errors.push(`bymonth は 1 〜 12 で指定してください: ${rule.bymonth}`)
    }
  }

  // 形式は正しいが一度も発生しないルールは、登録できても意味がないので弾く。
  if (errors.length === 0 && nextOccurrences(rule, rule.startDate, 1).length === 0) {
    errors.push("この条件では発生日が一度もありません")
  }

  return errors
}

/** ルールを日本語 1 行で要約する。一覧表示とスクリプトのプレビューで使う */
export function describeRule(rule: RecurrenceRule): string {
  const n = Math.max(1, Math.trunc(rule.interval))
  const start = parseDateKey(rule.startDate)

  switch (rule.freq) {
    case "daily":
      return n === 1 ? "毎日" : `${n} 日ごと`
    case "weekly": {
      const days = (rule.byweekday?.length ? rule.byweekday : [start.getUTCDay()])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_LABELS[d])
        .join("・")
      return `${n === 1 ? "毎週" : `${n} 週ごと`} ${days}曜`
    }
    case "monthly":
      return `${n === 1 ? "毎月" : `${n} か月ごと`} ${rule.bymonthday ?? start.getUTCDate()} 日`
    case "yearly":
      return `${n === 1 ? "毎年" : `${n} 年ごと`} ${rule.bymonth ?? start.getUTCMonth() + 1} 月 ${rule.bymonthday ?? start.getUTCDate()} 日`
  }
}
