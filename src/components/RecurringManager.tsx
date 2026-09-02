"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createRecurringAction,
  deleteRecurringAction,
  runRecurringNowAction,
  setRecurringEnabledAction,
  updateRecurringAction,
} from "@/app/recurring/actions"
import { describeRule, nextOccurrences, todayLocal } from "@/lib/recurrence"
import { RecurringFormSheet } from "./RecurringFormSheet"
import type { CreateRecurringTaskInput, RecurringTask } from "@/types/recurring"

export function RecurringManager({
  initialRules,
  tagOptions,
  locationOptions,
}: {
  initialRules: RecurringTask[]
  tagOptions: string[]
  locationOptions: string[]
}) {
  const router = useRouter()
  // シートの開閉と編集対象は 1 つの概念なので 1 状態で持つ。
  // null = 閉じている / { rule: null } = 新規 / { rule } = 編集。
  const [sheet, setSheet] = useState<{ rule: RecurringTask | null } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // e2e が操作開始のタイミングを掴めるようにする (TaskManager と同じ目印)
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1"
  }, [])

  // 次回発生日は props が変わらない限り不変。トグルや通知の再描画で
  // 全行ぶん計算し直さないよう固定する。
  const today = todayLocal()
  const upcoming = useMemo(
    () => new Map(initialRules.map((r) => [r.id, nextOccurrences(r, today, 1)[0] ?? null])),
    [initialRules, today],
  )

  /** サーバー操作 → 再取得。全ハンドラでこの形に揃える */
  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
      router.refresh()
    })
  }

  async function handleSubmit(input: CreateRecurringTaskInput) {
    const editing = sheet?.rule
    if (editing) await updateRecurringAction(editing.id, input)
    else await createRecurringAction(input)
    run(async () => {})
  }

  function handleDelete(rule: RecurringTask) {
    if (!confirm(`「${rule.title}」の繰り返し設定を削除します。\n生成済みのタスクは残ります。`)) return
    run(() => deleteRecurringAction(rule.id))
  }

  function handleRunNow() {
    run(async () => {
      const { created } = await runRecurringNowAction()
      setNotice(created > 0 ? `${created} 件のタスクを生成しました` : "生成対象はありませんでした")
    })
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-4 pb-[calc(16px+var(--safe-bottom))]" data-testid="recurring-manager">
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          data-testid="recurring-new"
          onClick={() => setSheet({ rule: null })}
          className="font-pixel h-9 px-4 text-xs tracking-widest uppercase border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors"
        >
          + New Rule
        </button>
        <button
          type="button"
          data-testid="recurring-run-now"
          onClick={handleRunNow}
          disabled={pending}
          className="font-pixel h-9 px-4 text-xs tracking-widest uppercase border border-[var(--border-strong)] text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
        >
          今すぐ生成
        </button>
      </div>

      {notice && <p className="text-xs text-[var(--text-dim)] mb-4">{notice}</p>}

      {initialRules.length === 0 ? (
        <p className="text-xs text-[var(--text-faint)] py-8 text-center">
          繰り返し設定はまだありません。
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {initialRules.map((rule) => (
              <li
                key={rule.id}
                data-testid="recurring-rule"
                data-enabled={rule.enabled ? "1" : "0"}
                className="border border-[var(--border)] p-4 flex flex-col gap-1"
                style={{ opacity: rule.enabled ? 1 : 0.5 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSheet({ rule })}
                    className="flex-1 text-left text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors"
                  >
                    {rule.title}
                  </button>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => run(() => setRecurringEnabledAction(rule.id, !rule.enabled))}
                      disabled={pending}
                      className="text-xs font-mono text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
                    >
                      {rule.enabled ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule)}
                      disabled={pending}
                      className="text-xs font-mono text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
                    >
                      del
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-dim)]">
                  {describeRule(rule)}
                  {rule.dueTime && ` ${rule.dueTime}`}
                  {rule.leadDays > 0 && ` / ${rule.leadDays} 日前に作成`}
                </p>

                <p className="text-xs text-[var(--text-faint)]">
                  次回: {upcoming.get(rule.id) ?? "（この先の予定なし）"}
                </p>

                {rule.tags.length > 0 && (
                  <p className="text-xs text-[var(--text-faint)]">{rule.tags.map((t) => `#${t}`).join(" ")}</p>
                )}
              </li>
          ))}
        </ul>
      )}

      {sheet && (
        <RecurringFormSheet
          rule={sheet.rule}
          tagOptions={tagOptions}
          locationOptions={locationOptions}
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
