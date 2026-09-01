"use client"

import { useEffect, useMemo, useState } from "react"
import { describeRule, nextOccurrences, todayLocal, validateRule, WEEKDAY_LABELS } from "@/lib/recurrence"
import { snapTimeTo5Min } from "@/lib/due-date"
import { CREATABLE_STATUSES, PRIORITY_ORDER } from "@/constants/task"
import { PRIORITY_STYLES } from "@/constants/styles"
import { TagSelector } from "./TagSelector"
import type {
  CreateRecurringTaskInput,
  RecurrenceFrequency,
  RecurrenceRule,
  RecurringTask,
} from "@/types/recurring"
import type { TaskPriority, TaskStatus } from "@/types/task"

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "日ごと",
  weekly: "週ごと",
  monthly: "か月ごと",
  yearly: "年ごと",
}

type FormState = {
  title: string
  body: string
  status: TaskStatus
  priority: "" | TaskPriority
  location: string
  tags: string[]
  freq: RecurrenceFrequency
  interval: number
  byweekday: number[]
  bymonthday: number
  bymonth: number
  dueTime: string
  leadDays: number
  startDate: string
  endDate: string
}

function toFormState(rule: RecurringTask | null): FormState {
  const start = rule?.startDate ?? todayLocal()
  const [, month, day] = start.split("-")
  return {
    title: rule?.title ?? "",
    body: rule?.body ?? "",
    status: rule?.status ?? "未着手",
    priority: rule?.priority ?? "",
    location: rule?.location ?? "",
    tags: rule?.tags ?? [],
    freq: rule?.freq ?? "weekly",
    interval: rule?.interval ?? 1,
    byweekday: rule?.byweekday ?? [],
    bymonthday: rule?.bymonthday ?? Number(day),
    bymonth: rule?.bymonth ?? Number(month),
    dueTime: rule?.dueTime ?? "",
    leadDays: rule?.leadDays ?? 0,
    startDate: start,
    endDate: rule?.endDate ?? "",
  }
}

/** フォームの値から、発生日計算に渡せるルールを組み立てる */
function toRule(form: FormState): RecurrenceRule {
  return {
    freq: form.freq,
    interval: form.interval,
    byweekday: form.freq === "weekly" && form.byweekday.length > 0 ? form.byweekday : null,
    bymonthday: form.freq === "monthly" || form.freq === "yearly" ? form.bymonthday : null,
    bymonth: form.freq === "yearly" ? form.bymonth : null,
    startDate: form.startDate,
    endDate: form.endDate || null,
  }
}

/**
 * 呼び出し側はシートを開くときだけマウントする (閉じたら unmount)。
 * 開くたびにフォーム状態が初期化されるので、開閉に合わせた reset が要らない。
 */
export function RecurringFormSheet({
  rule,
  tagOptions,
  locationOptions,
  onClose,
  onSubmit,
}: {
  /** null なら新規作成 */
  rule: RecurringTask | null
  tagOptions: string[]
  locationOptions: string[]
  onClose: () => void
  onSubmit: (input: CreateRecurringTaskInput) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(rule))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const patch = (next: Partial<FormState>) => setForm((f) => ({ ...f, ...next }))

  // 発生日の計算は日単位の総当たりで、yearly だと数千日ぶん回る。
  // タイトルや本文の打鍵で走らないよう、繰り返し条件だけを依存に取る。
  const { candidate, ruleErrors, preview } = useMemo(() => {
    const candidate = toRule(form)
    const ruleErrors = validateRule(candidate)
    return {
      candidate,
      ruleErrors,
      preview: ruleErrors.length === 0 ? nextOccurrences(candidate, todayLocal(), 3) : [],
    }
  }, [form.freq, form.interval, form.byweekday, form.bymonthday, form.bymonth, form.startDate, form.endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleWeekday(day: number) {
    patch({
      byweekday: form.byweekday.includes(day)
        ? form.byweekday.filter((d) => d !== day)
        : [...form.byweekday, day],
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError("タイトルを入力してください")
      return
    }

    setPending(true)
    setError(null)
    try {
      await onSubmit({
        title,
        body: form.body.trim(),
        status: form.status,
        priority: form.priority || null,
        location: form.location || null,
        tags: form.tags,
        dueTime: form.dueTime || null,
        leadDays: form.leadDays,
        ...candidate,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:justify-center lg:items-center lg:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative rounded-none px-4 pt-4 pb-8 safe-bottom max-h-[85svh] overflow-y-auto overscroll-contain lg:w-full lg:max-h-[80vh] lg:pb-6 lg:border lg:border-[var(--border-strong)] lg:mx-auto lg:max-w-lg"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="w-10 h-1 rounded-none mx-auto mb-4 lg:hidden"
          style={{ backgroundColor: "var(--border-strong)" }}
        />

        <h2 className="font-pixel text-sm text-[var(--accent)] tracking-widest uppercase mb-4 accent-glow-text-sm">
          {rule ? "✦ Edit Rule" : "✦ New Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="recurring-form">
          <input
            type="text"
            data-testid="recurring-title"
            placeholder="TASK NAME (required)"
            required
            autoFocus
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="field w-full"
          />

          <textarea
            placeholder="BODY (optional)"
            rows={3}
            value={form.body}
            onChange={(e) => patch({ body: e.target.value })}
            className="field w-full resize-none min-h-[88px]"
          />

          {/* 繰り返し条件 */}
          <div className="flex flex-col gap-4 border border-[var(--border)] p-4">
            <p className="font-pixel text-xs text-[var(--text-dim)] tracking-widest uppercase">繰り返し</p>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                min={1}
                max={99}
                value={form.interval}
                onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
                className="field w-full"
                aria-label="間隔"
              />
              <select
                value={form.freq}
                onChange={(e) => patch({ freq: e.target.value as RecurrenceFrequency })}
                className="field w-full"
                aria-label="頻度"
              >
                {(Object.keys(FREQ_LABELS) as RecurrenceFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQ_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>

            {form.freq === "weekly" && (
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((label, day) => {
                  const on = form.byweekday.includes(day)
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className="flex-1 h-9 text-xs border transition-colors"
                      style={{
                        borderColor: on ? "var(--accent)" : "var(--border-strong)",
                        backgroundColor: on ? "var(--accent)" : "transparent",
                        color: on ? "var(--bg)" : "var(--text-dim)",
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {(form.freq === "monthly" || form.freq === "yearly") && (
              <div className="grid grid-cols-2 gap-4">
                {form.freq === "yearly" && (
                  <select
                    value={form.bymonth}
                    onChange={(e) => patch({ bymonth: Number(e.target.value) })}
                    className="field w-full"
                    aria-label="月"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} 月
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={form.bymonthday}
                  onChange={(e) => patch({ bymonthday: Number(e.target.value) })}
                  className="field w-full"
                  aria-label="日"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} 日
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-faint)]">開始日</span>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  className="field w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-faint)]">終了日 (任意)</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  className="field w-full"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-faint)]">期限の時刻 (任意)</span>
                <input
                  type="time"
                  step={300}
                  value={form.dueTime}
                  onChange={(e) => patch({ dueTime: e.target.value })}
                  onBlur={(e) => patch({ dueTime: snapTimeTo5Min(e.target.value) })}
                  className="field w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-faint)]">何日前に作るか</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.leadDays}
                  onChange={(e) => patch({ leadDays: Math.max(0, Number(e.target.value) || 0) })}
                  className="field w-full"
                />
              </label>
            </div>

            {/* 設定内容が意図どおりかを、保存前に発生日で確認できるようにする */}
            <div className="text-xs text-[var(--text-dim)] leading-relaxed" data-testid="recurring-preview">
              {ruleErrors.length > 0 ? (
                <span className="text-[var(--accent)]">{ruleErrors[0]}</span>
              ) : (
                <>
                  <span className="text-[var(--text)]">{describeRule(candidate)}</span>
                  <br />
                  次回: {preview.length > 0 ? preview.join(" / ") : "（この先の予定なし）"}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.status}
              onChange={(e) => patch({ status: e.target.value as TaskStatus })}
              className="field w-full"
              aria-label="初期ステータス"
            >
              {CREATABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => patch({ priority: e.target.value as "" | TaskPriority })}
              className="field w-full"
              aria-label="優先度"
            >
              <option value="">Priority</option>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_STYLES[p].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">場所</p>
            <select
              value={form.location}
              onChange={(e) => patch({ location: e.target.value })}
              className="field w-full"
            >
              <option value="">(指定なし)</option>
              {locationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="font-pixel text-xs text-[var(--text-dim)] mb-4 tracking-widest uppercase">タグ</p>
            <TagSelector options={tagOptions} selected={form.tags} onChange={(tags) => patch({ tags })} />
          </div>

          {error && <p className="text-xs text-[var(--accent)]">{error}</p>}

          {/* ルール不正時はプレビュー欄に理由が出ているので、ここでは押させない */}
          <button
            type="submit"
            data-testid="recurring-submit"
            disabled={pending || ruleErrors.length > 0}
            className="font-pixel w-full rounded-none py-3 text-sm tracking-widest uppercase font-semibold disabled:opacity-40 transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              boxShadow: pending ? "none" : "0 0 8px rgba(220,20,60,0.4)",
              minHeight: "var(--tap-min)",
            }}
          >
            {pending ? "..." : rule ? "SAVE RULE" : "CREATE RULE"}
          </button>
        </form>
      </div>
    </div>
  )
}
