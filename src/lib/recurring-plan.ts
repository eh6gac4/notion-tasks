// 「いつ・何を生成するか」を決める部分。D1 実装と dev のインメモリ実装が
// これを共有し、各ストアは台帳の読み書きとタスク作成の呼び出しだけを持つ。
//
// ここを分けているのは、バックフィル窓・生成上限・既定ステータス・期日の
// 組み立てを 2 実装で書き分けると、e2e はモック経路を通るため
// 「テストは緑だが本番だけ挙動が違う」が構造的に起きるため。
//
// D1 にもブラウザ API にも依存しない純関数だけを置く。

import { occurrencesInRange, shiftDateKey } from "@/lib/recurrence"
import type { RecurringTask } from "@/types/recurring"
import type { CreateTaskInput, TaskStatus } from "@/types/task"

/** ルールの status が空だった場合に生成されるタスクのステータス */
export const DEFAULT_STATUS: TaskStatus = "未着手"

/**
 * 何日ぶん遡って未生成の回を拾うか。
 * cron が数日落ちていた場合の取りこぼしは埋めたいが、start_date が何年も前の
 * ルールを後から有効化したときに過去ぶんが大量に生えるのは困るため上限を設ける。
 */
export const BACKFILL_DAYS = 30

/** 1 回の実行で 1 ルールが生成できる上限。暴走時の被害を抑えるための安全弁 */
export const MAX_PER_RULE = 40

/**
 * 発生日と時刻から tasks.due の保存値を組み立てる。
 *
 * src/lib/due-date.ts の buildDue は「ブラウザのローカル TZ」を読むため、
 * UTC で動く Worker から呼ぶと 9 時間ずれる。ここでは日本時間固定で組む。
 */
export function buildDueForOccurrence(occurrenceDate: string, dueTime: string | null): string {
  if (!dueTime) return occurrenceDate
  return `${occurrenceDate}T${dueTime}:00.000+09:00`
}

/**
 * その日の実行で見るべき発生日の範囲。
 * 期日 D の回は「today >= D - leadDays」すなわち「D <= today + leadDays」で生成する。
 */
export function generationWindow(rule: RecurringTask, today: string): { from: string; to: string } {
  return { from: shiftDateKey(today, -BACKFILL_DAYS), to: shiftDateKey(today, rule.leadDays) }
}

/** 範囲内の発生日のうち、まだ生成していないものを昇順で返す */
export function pendingOccurrences(rule: RecurringTask, today: string, done: ReadonlySet<string>): string[] {
  const { from, to } = generationWindow(rule, today)
  return occurrencesInRange(rule, from, to)
    .filter((date) => !done.has(date))
    .slice(0, MAX_PER_RULE)
}

/** ルールの雛形部分を、その回のタスク作成入力へ複写する */
export function taskInputForOccurrence(rule: RecurringTask, occurrenceDate: string): CreateTaskInput {
  return {
    title: rule.title,
    status: rule.status ?? DEFAULT_STATUS,
    priority: rule.priority,
    due: buildDueForOccurrence(occurrenceDate, rule.dueTime),
    tags: rule.tags,
    location: rule.location,
    body: rule.body,
  }
}
