// task.due の保存値（ISO 文字列） ↔ HTML input 値（yyyy-mm-dd / hh:mm）の相互変換ヘルパー。
// 時刻なし: "2026-04-30"
// 時刻あり: "2026-04-30T18:00:00.000+09:00" のようにローカル TZ オフセット付き ISO 8601 で保存

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function localOffsetSuffix(d: Date): string {
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMin)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

export function parseDue(due: string | null): { date: string; time: string } {
  if (!due) return { date: "", time: "" }
  if (!due.includes("T")) return { date: due, time: "" }
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  return { date, time }
}

export function buildDue(date: string, time: string): string | null {
  if (!date) return null
  if (!time) return date
  const local = new Date(`${date}T${time}:00`)
  if (Number.isNaN(local.getTime())) return date
  return `${date}T${time}:00.000${localOffsetSuffix(local)}`
}

// "HH:mm" を最寄りの 5 分刻みに丸める（23:55 が上限。23:58 → 23:55）
export function snapTimeTo5Min(time: string): string {
  if (!time) return ""
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!m) return ""
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return ""
  const total = Math.min(23 * 60 + 55, Math.round((hh * 60 + mm) / 5) * 5)
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

export function formatDueShort(due: string): string {
  if (!due.includes("T")) {
    // 日付のみは TZ 解釈なしで素直にパース
    const [, mm, dd] = due.split("-")
    if (mm && dd) return `${mm}/${dd}`
    return due
  }
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return due
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// 期限切れ判定。null は false。日付のみの値は当日 0:00 と比較されるため、当日中は overdue にならない。
export function isOverdue(due: string | null): boolean {
  if (!due) return false
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}
