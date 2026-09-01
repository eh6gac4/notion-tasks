import type { D1Database } from "@cloudflare/workers-types"
import { shiftDateKey, validateRule } from "@/lib/recurrence"
import { generationWindow, pendingOccurrences, taskInputForOccurrence } from "@/lib/recurring-plan"
import type {
  CreateRecurringTaskInput,
  RecurrenceFrequency,
  RecurringTask,
  UpdateRecurringTaskInput,
} from "@/types/recurring"
import type { TaskPriority, TaskStatus } from "@/types/task"
import { newId, nowIso, type D1TaskStore } from "./d1"
import type { GenerateResult, RecurringStore } from "./types"

type RecurringRow = {
  id: string
  title: string
  status: string | null
  priority: string | null
  location: string | null
  body: string
  freq: string
  interval: number
  byweekday: string | null
  bymonthday: number | null
  bymonth: number | null
  due_time: string | null
  lead_days: number
  start_date: string
  end_date: string | null
  enabled: number
  created_time: string
  last_edited_time: string
}

function rowToRule(row: RecurringRow, tags: string[]): RecurringTask {
  return {
    id: row.id,
    title: row.title,
    status: (row.status as TaskStatus | null) ?? null,
    priority: (row.priority as TaskPriority | null) ?? null,
    location: row.location,
    body: row.body,
    tags,
    freq: row.freq as RecurrenceFrequency,
    interval: row.interval,
    byweekday: row.byweekday ? row.byweekday.split(",").map(Number) : null,
    bymonthday: row.bymonthday,
    bymonth: row.bymonth,
    dueTime: row.due_time,
    leadDays: row.lead_days,
    startDate: row.start_date,
    endDate: row.end_date,
    enabled: row.enabled === 1,
    createdTime: row.created_time,
    lastEditedTime: row.last_edited_time,
  }
}

function serializeWeekdays(days: number[] | null | undefined): string | null {
  if (!days || days.length === 0) return null
  return [...new Set(days)].sort((a, b) => a - b).join(",")
}

/**
 * 繰り返しルールの CRUD と、ルールからのタスク自動生成。
 *
 * タスクの作成そのものは D1TaskStore.createTask に委譲する。タグ・option_sets の
 * 更新など通常作成と同じ副作用をそのまま得るためで、ここで INSERT を書き直さない。
 */
export class RecurringTaskStore implements RecurringStore {
  constructor(
    private readonly db: D1Database,
    private readonly tasks: D1TaskStore,
  ) {}

  private async tagsFor(ids: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>(ids.map((id) => [id, []]))
    if (ids.length === 0) return map

    const { results } = await this.db
      .prepare(
        `SELECT recurring_id, tag FROM recurring_task_tags
         WHERE recurring_id IN (${ids.map(() => "?").join(", ")})`,
      )
      .bind(...ids)
      .all<{ recurring_id: string; tag: string }>()

    for (const r of results) map.get(r.recurring_id)?.push(r.tag)
    return map
  }

  async listRules(): Promise<RecurringTask[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM recurring_tasks ORDER BY enabled DESC, title ASC`)
      .all<RecurringRow>()

    const tags = await this.tagsFor(results.map((r) => r.id))
    return results.map((r) => rowToRule(r, tags.get(r.id) ?? []))
  }

  async getRule(id: string): Promise<RecurringTask | null> {
    const row = await this.db.prepare(`SELECT * FROM recurring_tasks WHERE id = ?`).bind(id).first<RecurringRow>()
    if (!row) return null
    const tags = await this.tagsFor([id])
    return rowToRule(row, tags.get(id) ?? [])
  }

  async createRule(input: CreateRecurringTaskInput): Promise<RecurringTask> {
    const id = newId()
    const ts = nowIso()
    const rule = {
      freq: input.freq,
      interval: input.interval ?? 1,
      byweekday: input.byweekday ?? null,
      bymonthday: input.bymonthday ?? null,
      bymonth: input.bymonth ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
    }

    const errors = validateRule(rule)
    if (errors.length > 0) throw new Error(`繰り返しルールが不正です: ${errors.join(" / ")}`)

    const tags = input.tags ?? []
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO recurring_tasks
             (id, title, status, priority, location, body,
              freq, interval, byweekday, bymonthday, bymonth,
              due_time, lead_days, start_date, end_date, enabled,
              created_time, last_edited_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.title,
          input.status ?? null,
          input.priority ?? null,
          input.location ?? null,
          input.body ?? "",
          rule.freq,
          rule.interval,
          serializeWeekdays(rule.byweekday),
          rule.bymonthday,
          rule.bymonth,
          input.dueTime ?? null,
          input.leadDays ?? 0,
          rule.startDate,
          rule.endDate,
          input.enabled === false ? 0 : 1,
          ts,
          ts,
        ),
      ...tags.map((tag) =>
        this.db
          .prepare(`INSERT OR IGNORE INTO recurring_task_tags (recurring_id, tag) VALUES (?, ?)`)
          .bind(id, tag),
      ),
    ])

    const created = await this.getRule(id)
    if (!created) throw new Error(`createRule: 作成直後のルールを読み戻せません (${id})`)
    return created
  }

  async updateRule(id: string, input: UpdateRecurringTaskInput): Promise<RecurringTask> {
    const current = await this.getRule(id)
    if (!current) throw new Error(`updateRule: ルールが見つかりません (${id})`)

    // 部分更新でも「更新後のルール全体」が妥当かを検証する。
    const merged = {
      freq: input.freq ?? current.freq,
      interval: input.interval ?? current.interval,
      byweekday: input.byweekday !== undefined ? input.byweekday : current.byweekday,
      bymonthday: input.bymonthday !== undefined ? input.bymonthday : current.bymonthday,
      bymonth: input.bymonth !== undefined ? input.bymonth : current.bymonth,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate !== undefined ? input.endDate : current.endDate,
    }
    const errors = validateRule(merged)
    if (errors.length > 0) throw new Error(`繰り返しルールが不正です: ${errors.join(" / ")}`)

    const sets: string[] = []
    const values: unknown[] = []
    const set = (col: string, value: unknown) => {
      sets.push(`${col} = ?`)
      values.push(value)
    }

    if (input.title !== undefined) set("title", input.title)
    if (input.status !== undefined) set("status", input.status)
    if (input.priority !== undefined) set("priority", input.priority)
    if (input.location !== undefined) set("location", input.location)
    if (input.body !== undefined) set("body", input.body)
    if (input.dueTime !== undefined) set("due_time", input.dueTime)
    if (input.leadDays !== undefined) set("lead_days", input.leadDays)
    if (input.enabled !== undefined) set("enabled", input.enabled ? 1 : 0)
    set("freq", merged.freq)
    set("interval", merged.interval)
    set("byweekday", serializeWeekdays(merged.byweekday))
    set("bymonthday", merged.bymonthday)
    set("bymonth", merged.bymonth)
    set("start_date", merged.startDate)
    set("end_date", merged.endDate)
    set("last_edited_time", nowIso())

    const statements = [
      this.db.prepare(`UPDATE recurring_tasks SET ${sets.join(", ")} WHERE id = ?`).bind(...values, id),
    ]

    if (input.tags !== undefined) {
      statements.push(this.db.prepare(`DELETE FROM recurring_task_tags WHERE recurring_id = ?`).bind(id))
      statements.push(
        ...input.tags.map((tag) =>
          this.db
            .prepare(`INSERT OR IGNORE INTO recurring_task_tags (recurring_id, tag) VALUES (?, ?)`)
            .bind(id, tag),
        ),
      )
    }

    await this.db.batch(statements)

    const updated = await this.getRule(id)
    if (!updated) throw new Error(`updateRule: 更新直後のルールを読み戻せません (${id})`)
    return updated
  }

  /**
   * ルールを削除する。生成済みタスクは残す (instances は CASCADE で消える)。
   * 過去に生えたタスクまで巻き添えで消えると困るため。
   */
  async deleteRule(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM recurring_tasks WHERE id = ?`).bind(id).run()
  }

  /**
   * 生成済みの回を 1 クエリでまとめて引く。ルールごとに引くと有効ルール数ぶんの
   * 往復が直列に積まれるため。
   */
  private async generatedDates(rules: RecurringTask[], today: string): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>(rules.map((r) => [r.id, new Set<string>()]))
    if (rules.length === 0) return map

    // 窓はルールごとに leadDays ぶん違うが、最大値で一括して引き、
    // 実際の絞り込みは pendingOccurrences 側の候補日で行う。
    const { from } = generationWindow(rules[0], today)
    const to = shiftDateKey(today, Math.max(...rules.map((r) => r.leadDays)))

    const { results } = await this.db
      .prepare(
        `SELECT recurring_id, occurrence_date FROM recurring_task_instances
         WHERE occurrence_date BETWEEN ? AND ?
           AND recurring_id IN (${rules.map(() => "?").join(", ")})`,
      )
      .bind(from, to, ...rules.map((r) => r.id))
      .all<{ recurring_id: string; occurrence_date: string }>()

    for (const r of results) map.get(r.recurring_id)?.add(r.occurrence_date)
    return map
  }

  /** 未生成の回だけをタスク化する。cron から日次で呼ばれる */
  async generateDueTasks(today: string): Promise<GenerateResult> {
    const rules = (await this.listRules()).filter((r) => r.enabled)
    const done = await this.generatedDates(rules, today)
    const result: GenerateResult = { created: 0, perRule: [] }

    for (const rule of rules) {
      const missing = pendingOccurrences(rule, today, done.get(rule.id) ?? new Set())
      if (missing.length === 0) continue

      const dates: string[] = []
      for (const date of missing) {
        // タスクを先に作り、その後で台帳に記録する。逆順にすると台帳だけ進んで
        // タスクが無い回が生まれ、その回は二度と生成されなくなる。
        // この順なら最悪でも翌日に重複が 1 件生えるだけで、目に見えて直せる。
        const task = await this.tasks.createTask(taskInputForOccurrence(rule, date))

        await this.db
          .prepare(
            `INSERT OR IGNORE INTO recurring_task_instances
               (recurring_id, occurrence_date, task_id, created_time)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(rule.id, date, task.id, nowIso())
          .run()

        dates.push(date)
        result.created += 1
      }

      result.perRule.push({ ruleId: rule.id, title: rule.title, dates })
    }

    return result
  }
}
