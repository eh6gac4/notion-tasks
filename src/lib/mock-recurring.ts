// dev / e2e 用のインメモリ繰り返しルール。
//
// 繰り返しルールは D1 にしか存在しないため、これが無いと dev で /recurring が
// 一切開けない。src/lib/mock-tasks.ts と同じ方式で、プロセス内の配列を実体に
// した差し替え実装を置く。
//
// 発生日の計算 (recurrence.ts) と生成ポリシー (recurring-plan.ts) は D1 実装と
// 共有しているので、この実装に固有なのは「台帳が Set である」ことだけ。

import { validateRule } from "@/lib/recurrence"
import { pendingOccurrences, taskInputForOccurrence } from "@/lib/recurring-plan"
import { createMockTask } from "@/lib/mock-tasks"
import type { CreateRecurringTaskInput, RecurringTask, UpdateRecurringTaskInput } from "@/types/recurring"
import type { GenerateResult, RecurringStore } from "@/lib/store/types"

const INITIAL_RULES: RecurringTask[] = [
  {
    id: "mock-rule-1",
    title: "【DEV】燃えるゴミを出す",
    status: null,
    priority: "medium",
    location: null,
    body: "玄関のゴミをまとめる",
    tags: ["Home"],
    freq: "weekly",
    interval: 1,
    byweekday: [1, 4],
    bymonthday: null,
    bymonth: null,
    dueTime: "07:00",
    leadDays: 0,
    startDate: "2026-04-01",
    endDate: null,
    enabled: true,
    createdTime: "2026-04-01T00:00:00.000Z",
    lastEditedTime: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "mock-rule-2",
    title: "【DEV】家賃の振込",
    status: null,
    priority: "high",
    location: null,
    body: "",
    tags: ["Money"],
    freq: "monthly",
    interval: 1,
    byweekday: null,
    bymonthday: 27,
    bymonth: null,
    dueTime: "10:00",
    leadDays: 3,
    startDate: "2026-04-01",
    endDate: null,
    enabled: true,
    createdTime: "2026-04-01T00:00:00.000Z",
    lastEditedTime: "2026-04-01T00:00:00.000Z",
  },
]

let rules: RecurringTask[] = INITIAL_RULES.map((r) => ({ ...r }))
/** ルール id → 生成済みの発生日。D1 の recurring_task_instances に相当する台帳 */
let generated = new Map<string, Set<string>>()
let nextId = 100

export function resetMockRecurring() {
  rules = INITIAL_RULES.map((r) => ({ ...r }))
  generated = new Map()
  nextId = 100
}

function ruleOf(input: CreateRecurringTaskInput) {
  return {
    freq: input.freq,
    interval: input.interval ?? 1,
    byweekday: input.byweekday ?? null,
    bymonthday: input.bymonthday ?? null,
    bymonth: input.bymonth ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
  }
}

function assertValid(rule: ReturnType<typeof ruleOf>) {
  const errors = validateRule(rule)
  if (errors.length > 0) throw new Error(`繰り返しルールが不正です: ${errors.join(" / ")}`)
}

export const mockRecurringStore: RecurringStore = {
  async listRules(): Promise<RecurringTask[]> {
    return rules
      .map((r) => ({ ...r }))
      .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.title.localeCompare(b.title))
  },

  async getRule(id: string): Promise<RecurringTask | null> {
    const found = rules.find((r) => r.id === id)
    return found ? { ...found } : null
  },

  async createRule(input: CreateRecurringTaskInput): Promise<RecurringTask> {
    const rule = ruleOf(input)
    assertValid(rule)

    const now = new Date().toISOString()
    const created: RecurringTask = {
      id: `mock-rule-${nextId++}`,
      title: input.title,
      status: input.status ?? null,
      priority: input.priority ?? null,
      location: input.location ?? null,
      body: input.body ?? "",
      tags: input.tags ?? [],
      dueTime: input.dueTime ?? null,
      leadDays: input.leadDays ?? 0,
      enabled: input.enabled !== false,
      createdTime: now,
      lastEditedTime: now,
      ...rule,
    }
    rules.push(created)
    return { ...created }
  },

  async updateRule(id: string, input: UpdateRecurringTaskInput): Promise<RecurringTask> {
    const current = rules.find((r) => r.id === id)
    if (!current) throw new Error(`updateRule: ルールが見つかりません (${id})`)

    const merged = {
      freq: input.freq ?? current.freq,
      interval: input.interval ?? current.interval,
      byweekday: input.byweekday !== undefined ? input.byweekday : current.byweekday,
      bymonthday: input.bymonthday !== undefined ? input.bymonthday : current.bymonthday,
      bymonth: input.bymonth !== undefined ? input.bymonth : current.bymonth,
      startDate: input.startDate ?? current.startDate,
      endDate: input.endDate !== undefined ? input.endDate : current.endDate,
    }
    assertValid(merged)

    Object.assign(current, {
      title: input.title ?? current.title,
      status: input.status !== undefined ? input.status : current.status,
      priority: input.priority !== undefined ? input.priority : current.priority,
      location: input.location !== undefined ? input.location : current.location,
      body: input.body ?? current.body,
      tags: input.tags ?? current.tags,
      dueTime: input.dueTime !== undefined ? input.dueTime : current.dueTime,
      leadDays: input.leadDays ?? current.leadDays,
      enabled: input.enabled ?? current.enabled,
      lastEditedTime: new Date().toISOString(),
      ...merged,
    })
    return { ...current }
  },

  async deleteRule(id: string): Promise<void> {
    rules = rules.filter((r) => r.id !== id)
  },

  async generateDueTasks(today: string): Promise<GenerateResult> {
    const result: GenerateResult = { created: 0, perRule: [] }

    for (const rule of rules.filter((r) => r.enabled)) {
      const done = generated.get(rule.id) ?? new Set<string>()
      const dates = pendingOccurrences(rule, today, done)
      if (dates.length === 0) continue

      generated.set(rule.id, done)
      for (const date of dates) {
        createMockTask(taskInputForOccurrence(rule, date))
        done.add(date)
      }

      result.created += dates.length
      result.perRule.push({ ruleId: rule.id, title: rule.title, dates })
    }

    return result
  },
}
