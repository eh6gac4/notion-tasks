"use client"

import { memo, useOptimistic, useTransition, useRef, useState, type CSSProperties } from "react"
import type { Task, TaskStatus } from "@/types/task"
import type { TaskRelation } from "@/lib/task-relation"
import { updateTaskStatus } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_ACCENT, PRIORITY_STYLES } from "@/constants/styles"
import { formatDueShort, isOverdue } from "@/lib/due-date"
import { useTasksRefresh } from "./TasksRefreshContext"
import { useTaskRelation } from "./TaskRelationContext"

const RELATION_LABELS: Record<TaskRelation, string> = {
  prev: "前タスク",
  next: "次タスク",
  selected: "選択中",
}

// ボード上の1カード。カラム自体が現ステータスを示すが、ステータスのカラードット
// をカード右上に小さく置くことで「タップで他カラムへ移動できる」アフォーダンスを
// 持たせる。32×32 ヒットエリアに透明 select を被せ、ネイティブの dropdown を開く。
//
// memo: 検索打鍵 / フィルタ・ソート切替 / refresh 後に親で tasks 配列が新しく
// なるが、要素の参照 (task) が変わらない限り再 render を skip。多数カードの jank 軽減。
export const TaskItem = memo(function TaskItem({
  task,
  onSelect,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: {
  task: Task
  onSelect: (task: Task) => void
  isCollapsible?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: (taskId: string) => void
}) {
  const [, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const selectRef = useRef<HTMLSelectElement>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const refreshTasks = useTasksRefresh()
  const relation = useTaskRelation(task.id)

  const status = optimisticStatus
  const overdue = isOverdue(task.due)
  const hasMeta = task.priority || task.due || task.tags.length > 0 || task.childTaskIds.length > 0

  const isDoing = status === "進行中"
  const relationTitle = relation ? RELATION_LABELS[relation] : undefined
  return (
    <div
      data-testid="task-item"
      data-task-id={task.id}
      data-status={status ?? "未着手"}
      data-relation={relation}
      title={relationTitle}
      className="rounded-none border border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--border-accent)] card-glow-hover cursor-pointer"
      onClick={() => onSelect(task)}
    >
      <div className={`flex items-center gap-2 px-4 ${hasMeta || updateError ? "pt-2 pb-2" : "pt-3 pb-3"}`}>
        {task.icon && (
          task.icon.type === "emoji" ? (
            <span
              aria-hidden="true"
              className="flex-shrink-0 text-base leading-snug"
            >
              {task.icon.emoji}
            </span>
          ) : (
            <img
              src={task.icon.url}
              alt=""
              className="flex-shrink-0 w-4 h-4 rounded-none object-cover"
            />
          )
        )}
        <p
          data-testid="task-title"
          className="flex-1 min-w-0 text-sm text-[var(--text)] leading-snug font-medium break-words"
        >
          {task.title}
        </p>
        <div
          data-testid="task-status-trigger"
          className="relative w-8 h-8 flex-shrink-0 inline-flex items-center justify-center status-dot-trigger cursor-pointer"
          title={status ?? "未着手"}
        >
          <span
            aria-hidden="true"
            data-testid="task-status-dot"
            className={`status-dot${
              status === "アーカイブ済み" ? " status-dot--faint" : ""
            }${isDoing ? " animate-dot-pulse" : ""}`}
            style={{ "--status-color": STATUS_ACCENT[status ?? "未着手"] } as CSSProperties}
          />
          <span className="sr-only">{status ?? "未着手"}</span>
          <select
            ref={selectRef}
            defaultValue={status ?? "未着手"}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const next = e.target.value as TaskStatus
              startTransition(async () => {
                setUpdateError(null)
                setOptimisticStatus(next)
                if (selectRef.current) selectRef.current.value = next
                try {
                  await updateTaskStatus(task.id, next)
                  refreshTasks()
                } catch {
                  setUpdateError("ステータスの更新に失敗しました")
                  if (selectRef.current) selectRef.current.value = task.status ?? "未着手"
                }
              })
            }}
            className="absolute inset-0 w-full h-full cursor-pointer"
            style={{ opacity: 0.001 }}
            aria-label="ステータスを変更"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          {task.priority && (
            <span className={`text-[11px] ${PRIORITY_STYLES[task.priority].color}`}>
              {PRIORITY_STYLES[task.priority].label}
            </span>
          )}
          {task.due && (
            <span className={`font-pixel text-[11px] ${overdue ? "text-[var(--status-cancel)] font-semibold" : "text-[var(--text-dim)]"}`}>
              {overdue ? "⚠ " : ""}{formatDueShort(task.due)}
            </span>
          )}
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="font-pixel text-[11px] text-[var(--text-dim)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 rounded-none">
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="font-pixel text-[11px] text-[var(--text-faint)]">
              +{task.tags.length - 2}
            </span>
          )}
          {isCollapsible ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(task.id) }}
              className="font-pixel text-[11px] text-[var(--text-faint)] flex items-center gap-1"
              aria-label={isCollapsed ? "サブタスクを展開" : "サブタスクを折りたたむ"}
            >
              <span aria-hidden="true">{isCollapsed ? "▶" : "▼"}</span>
              <span>子{task.childTaskIds.length}件</span>
            </button>
          ) : task.childTaskIds.length > 0 ? (
            <span className="text-[11px] text-[var(--text-faint)]">子{task.childTaskIds.length}件</span>
          ) : null}
        </div>
      )}

      {updateError && (
        <p className="text-[11px] text-[var(--status-cancel)] px-4 pb-3">{updateError}</p>
      )}
    </div>
  )
})
