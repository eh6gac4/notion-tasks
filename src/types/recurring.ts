import type { TaskPriority, TaskStatus } from "./task"

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly"

/**
 * 発生日の計算に必要な部分だけを切り出した型。
 * src/lib/recurrence.ts の純関数はこれだけを受け取り、DB 由来のメタデータ
 * (id / title / enabled など) には依存しない。
 */
export type RecurrenceRule = {
  freq: RecurrenceFrequency
  /** 1 以上。何 日/週/月/年 ごとか */
  interval: number
  /** weekly のみ。0=日曜 .. 6=土曜。null なら start_date の曜日 */
  byweekday: number[] | null
  /** monthly / yearly。1..31。null なら start_date の日 */
  bymonthday: number | null
  /** yearly のみ。1..12。null なら start_date の月 */
  bymonth: number | null
  /** YYYY-MM-DD。interval の基準日であり、最初の候補日でもある */
  startDate: string
  /** YYYY-MM-DD。この日を含む。null なら無期限 */
  endDate: string | null
}

export type RecurringTask = RecurrenceRule & {
  id: string
  title: string
  /** 生成されるタスクの初期ステータス。null なら「未着手」 */
  status: TaskStatus | null
  priority: TaskPriority | null
  location: string | null
  body: string
  tags: string[]
  /** "HH:mm" (日本時間)。null なら期日は日付のみ */
  dueTime: string | null
  /** 期日の何日前に生成するか。0 なら期日当日 */
  leadDays: number
  enabled: boolean
  createdTime: string
  lastEditedTime: string
}

export type CreateRecurringTaskInput = {
  title: string
  freq: RecurrenceFrequency
  startDate: string
  interval?: number
  byweekday?: number[] | null
  bymonthday?: number | null
  bymonth?: number | null
  endDate?: string | null
  status?: TaskStatus | null
  priority?: TaskPriority | null
  location?: string | null
  body?: string
  tags?: string[]
  dueTime?: string | null
  leadDays?: number
  enabled?: boolean
}

export type UpdateRecurringTaskInput = Partial<CreateRecurringTaskInput>
