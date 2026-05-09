"use client"

import { useTransition, useState, useEffect, useRef } from "react"
import type { Task, TaskComment, TaskStatus, TaskPriority } from "@/types/task"
import { updateTaskAction, getTaskBlocksAction, updateTaskBlocksAction, getTaskCommentsAction, createTaskCommentAction } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES } from "@/constants/styles"
import { MarkdownPreview } from "./MarkdownPreview"
import { parseDue, buildDue, snapTimeTo5Min, formatDueShort } from "@/lib/due-date"
import { DueDateTimeInput } from "./DueDateTimeInput"
import { TagSelector } from "./TagSelector"
import { useTasksRefresh } from "./TasksRefreshContext"

export function TaskDetail({ task, tagOptions, onClose }: { task: Task; tagOptions: string[]; onClose: () => void }) {
  const [, startTransition] = useTransition()
  const [visible, setVisible] = useState(false)
  const refreshTasks = useTasksRefresh()

  const [editTitle, setEditTitle] = useState(task.title)
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status ?? "未着手")
  const [editPriority, setEditPriority] = useState<TaskPriority | "">(task.priority ?? "")
  const initialDue = parseDue(task.due)
  const [editDate, setEditDate] = useState(initialDue.date)
  const [editTime, setEditTime] = useState(snapTimeTo5Min(initialDue.time))
  const [editTags, setEditTags] = useState<string[]>(task.tags)

  const [blocks, setBlocks] = useState<string | null>(null)
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true)
  const [isEditingBlocks, setIsEditingBlocks] = useState(false)
  const [editBlocksContent, setEditBlocksContent] = useState("")
  const [isSavingBlocks, setIsSavingBlocks] = useState(false)
  const [blocksLoadError, setBlocksLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [blocksSaveError, setBlocksSaveError] = useState<string | null>(null)

  const [comments, setComments] = useState<TaskComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [commentsLoadError, setCommentsLoadError] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [commentPostError, setCommentPostError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef(0)
  const dragYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const rafIdRef = useRef(0)
  const isEditingBlocksRef = useRef(isEditingBlocks)
  useEffect(() => { isEditingBlocksRef.current = isEditingBlocks }, [isEditingBlocks])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // 背景スクロール抑制
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // パネルの open/close アニメーションを直接 DOM に適用
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    el.style.transition = "opacity 0.15s, transform 0.3s ease-out"
    el.style.transform = visible ? "translateY(0)" : "translateY(100%)"
  }, [visible])

  // handleClose — レンダー中に ref へ同期代入することでレースコンディションを回避
  const handleCloseRef = useRef<() => void>(() => {})
  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }
  handleCloseRef.current = handleClose

  // スワイプダウンで閉じる（rAF で描画を間引き、setState なしで直接 DOM 操作）
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const el = panel

    const THRESHOLD = 80

    function onTouchStart(e: TouchEvent) {
      touchStartYRef.current = e.touches[0].clientY
      isDraggingRef.current = false
      dragYRef.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      const deltaY = e.touches[0].clientY - touchStartYRef.current
      if (deltaY <= 0) return
      if (el.scrollTop > 0) return
      if (isEditingBlocksRef.current) return

      isDraggingRef.current = true
      dragYRef.current = deltaY
      e.preventDefault()

      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        el.style.transition = "opacity 0.15s"
        el.style.transform = `translateY(${deltaY}px)`
      })
    }

    function onTouchEnd() {
      if (!isDraggingRef.current) return
      cancelAnimationFrame(rafIdRef.current)
      const delta = dragYRef.current
      isDraggingRef.current = false
      dragYRef.current = 0

      if (delta >= THRESHOLD) {
        handleCloseRef.current()
      } else {
        el.style.transition = "opacity 0.15s, transform 0.3s ease-out"
        el.style.transform = "translateY(0)"
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      cancelAnimationFrame(rafIdRef.current)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadBlocks() {
      setBlocks(null)
      setIsLoadingBlocks(true)
      setIsEditingBlocks(false)
      setIsSavingBlocks(false)
      setBlocksLoadError(null)
      setBlocksSaveError(null)

      try {
        const md = await getTaskBlocksAction(task.id)
        if (cancelled) return
        setBlocks(md)
      } catch {
        if (cancelled) return
        setBlocks("")
        setBlocksLoadError("本文の読み込みに失敗しました。")
      } finally {
        if (cancelled) return
        setIsLoadingBlocks(false)
      }
    }

    void loadBlocks()

    return () => {
      cancelled = true
    }
  }, [task.id])

  useEffect(() => {
    let cancelled = false

    async function loadComments() {
      setIsLoadingComments(true)
      setCommentsLoadError(null)

      try {
        const data = await getTaskCommentsAction(task.id)
        if (cancelled) return
        setComments(data)
      } catch {
        if (cancelled) return
        setCommentsLoadError("コメントの読み込みに失敗しました。")
      } finally {
        if (cancelled) return
        setIsLoadingComments(false)
      }
    }

    void loadComments()

    return () => { cancelled = true }
  }, [task.id])

  async function handlePostComment() {
    const text = commentInput.trim()
    if (!text) return
    setIsPostingComment(true)
    setCommentPostError(null)

    try {
      const newComment = await createTaskCommentAction(task.id, text)
      setComments((prev) => [...prev, newComment])
      setCommentInput("")
    } catch (e) {
      setCommentPostError(e instanceof Error ? e.message : "コメントの投稿に失敗しました。")
    } finally {
      setIsPostingComment(false)
    }
  }

  function startEditingBlocks() {
    setEditBlocksContent(blocks ?? "")
    setBlocksSaveError(null)
    setIsEditingBlocks(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handleSaveBlocks() {
    setIsSavingBlocks(true)
    setBlocksSaveError(null)

    try {
      await updateTaskBlocksAction(task.id, editBlocksContent)
      // Re-fetch: saved markdown drops image lines, but Notion still has the
      // image blocks. Re-read so the preview reflects the real state.
      const refreshed = await getTaskBlocksAction(task.id)
      setBlocks(refreshed)
      setIsEditingBlocks(false)
    } catch {
      setBlocksSaveError("本文の保存に失敗しました。")
    } finally {
      setIsSavingBlocks(false)
    }
  }

  async function handleToggleCheckbox(lineIndex: number) {
    if (!blocks) return
    const lines = blocks.split("\n")
    const line = lines[lineIndex]
    if (/^- \[x\] /i.test(line)) {
      lines[lineIndex] = "- [ ] " + line.slice(6)
    } else if (/^- \[ \] /.test(line)) {
      lines[lineIndex] = "- [x] " + line.slice(6)
    } else {
      return
    }
    const newBlocks = lines.join("\n")
    setBlocks(newBlocks)
    try {
      await updateTaskBlocksAction(task.id, newBlocks)
    } catch {
      setBlocks(blocks)
    }
  }

  function save(input: Parameters<typeof updateTaskAction>[1]) {
    setSaveError(null)
    startTransition(async () => {
      try {
        await updateTaskAction(task.id, input)
        refreshTasks()
      } catch {
        setSaveError("更新に失敗しました")
      }
    })
  }

  function handleStatusChange(next: TaskStatus) {
    setEditStatus(next)
    save({ status: next })
  }

  function handlePriorityChange(next: TaskPriority | "") {
    setEditPriority(next)
    save({ priority: next || undefined })
  }

  function handleDueChange(date: string, time: string) {
    setEditDate(date)
    setEditTime(time)
    save({ due: buildDue(date, time) })
  }

  function handleTagsChange(next: string[]) {
    setEditTags(next)
    save({ tags: next })
  }

  const statusStyle = STATUS_STYLES[editStatus] ?? STATUS_STYLES["未着手"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        data-testid="task-detail-backdrop"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        data-testid="task-detail"
        className="relative rounded-t-2xl px-4 pt-4 pb-8 max-h-[85svh] overflow-y-auto"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <button onClick={handleClose} className="w-full flex justify-center pb-2 -mt-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--border-strong)" }} />
        </button>

        {saveError && (
          <p className="text-xs text-[var(--status-cancel)] mb-4">{saveError}</p>
        )}

        {/* Title — blur で保存 */}
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => { if (editTitle.trim()) save({ title: editTitle }) }}
          className="field w-full text-base mb-4"
          aria-label="タイトル"
        />

        {/* Status */}
        <div className="mb-4">
          <p className="font-pixel text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">Status</p>
          <div className="relative inline-flex">
            <span className={`inline-flex items-center h-7 px-3 rounded-full text-sm uppercase tracking-wider ${statusStyle}`}>
              {editStatus}
            </span>
            <select
              value={editStatus}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="absolute inset-0 w-full h-full cursor-pointer"
              style={{ opacity: 0.001 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <Row label="Priority">
            <select
              data-testid="priority-select"
              value={editPriority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority | "")}
              className="field text-sm"
            >
              <option value="">未設定</option>
              <option value="high">🚨 High</option>
              <option value="medium">⚠️ Med</option>
              <option value="low">💤 Low</option>
            </select>
          </Row>

          <Row label="期限">
            <DueDateTimeInput
              date={editDate}
              time={editTime}
              onChange={handleDueChange}
              size="compact"
            />
          </Row>

          <Row label="タグ">
            <TagSelector options={tagOptions} selected={editTags} onChange={handleTagsChange} />
          </Row>

          {task.source && (
            <Row label="ソース">
              <span className="text-sm text-[var(--text)]">{task.source}</span>
            </Row>
          )}

          {task.sourceUrl && (
            <Row label="URL">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[var(--accent)] underline break-all hover:opacity-80">
                {task.sourceUrl}
              </a>
            </Row>
          )}

          {task.childTaskIds.length > 0 && (
            <Row label="子タスク">
              <span className="text-sm text-[var(--text)]">{task.childTaskIds.length}件</span>
            </Row>
          )}

          {task.parentTaskIds.length > 0 && (
            <Row label="親タスク">
              <span className="text-sm text-[var(--text)]">{task.parentTaskIds.length}件</span>
            </Row>
          )}
        </div>

        {/* 本文 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-xs text-[var(--text-dim)] tracking-widest uppercase">本文</p>
            {!isLoadingBlocks && !isEditingBlocks && (
              <button
                type="button"
                onClick={startEditingBlocks}
                className="font-pixel text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors tracking-widest uppercase"
              >
                編集
              </button>
            )}
          </div>

          {blocksLoadError && !isEditingBlocks && (
            <p className="mb-2 text-xs text-[var(--status-cancel)]">{blocksLoadError}</p>
          )}

          {isLoadingBlocks ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            </div>
          ) : isEditingBlocks ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editBlocksContent}
                onChange={(e) => {
                  setEditBlocksContent(e.target.value)
                  // auto-resize
                  const el = e.target
                  el.style.height = "auto"
                  el.style.height = `${el.scrollHeight}px`
                }}
                className="field w-full resize-none min-h-[120px] font-mono"
                placeholder="Markdownで入力（# 見出し、- リスト など）"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBlocksSaveError(null)
                    setIsEditingBlocks(false)
                  }}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                  style={{ border: "1px solid var(--border-strong)" }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isSavingBlocks}
                  onClick={handleSaveBlocks}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs text-[var(--bg)] font-semibold transition-all"
                  style={{ backgroundColor: isSavingBlocks ? "rgba(220,20,60,0.5)" : "var(--accent)" }}
                >
                  {isSavingBlocks ? "保存中…" : "保存"}
                </button>
              </div>
              {blocksSaveError && (
                <p className="mt-2 text-xs text-[var(--status-cancel)]">{blocksSaveError}</p>
              )}
            </div>
          ) : blocks ? (
            <MarkdownPreview content={blocks} onToggleCheckbox={handleToggleCheckbox} />
          ) : (
            <p className="text-xs text-[var(--text-faint)] italic">本文なし</p>
          )}
        </div>

        {/* コメント */}
        <div className="mt-6">
          <p className="font-pixel text-xs text-[var(--text-dim)] mb-3 tracking-widest uppercase">
            コメント{comments.length > 0 && <span className="ml-2 text-[var(--text-faint)]">({comments.length})</span>}
          </p>

          {commentsLoadError && (
            <p className="mb-2 text-xs text-[var(--status-cancel)]">{commentsLoadError}</p>
          )}

          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.length === 0 && (
                <p className="text-xs text-[var(--text-faint)] italic">コメントなし</p>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg px-4 py-3"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--accent)]">{c.author}</span>
                    <span className="text-xs text-[var(--text-faint)]">·</span>
                    <span className="text-xs text-[var(--text-faint)]">
                      {formatDueShort(c.createdTime)}
                    </span>
                  </div>
                  <MarkdownPreview content={c.text} />
                </div>
              ))}
            </div>
          )}

          <div>
            <textarea
              value={commentInput}
              onChange={(e) => {
                setCommentInput(e.target.value)
                const el = e.target
                el.style.height = "auto"
                el.style.height = `${el.scrollHeight}px`
              }}
              placeholder="コメントを追加…"
              rows={2}
              className="field w-full resize-none min-h-[64px]"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                disabled={isPostingComment || !commentInput.trim()}
                onClick={handlePostComment}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs text-[var(--bg)] font-semibold transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {isPostingComment ? "投稿中…" : "投稿"}
              </button>
            </div>
            {commentPostError && (
              <p className="mt-1 text-xs text-[var(--status-cancel)]">{commentPostError}</p>
            )}
          </div>
        </div>

        {/* Notion link */}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-pixel mt-6 flex items-center justify-center gap-2 w-full rounded-lg py-3 text-sm text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] transition-colors tracking-widest uppercase"
          style={{ border: "1px solid var(--border-strong)" }}
        >
          Open in Notion →
        </a>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-center">
      <span className="font-pixel text-xs text-[var(--text-faint)] w-16 flex-shrink-0 tracking-wide uppercase">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
