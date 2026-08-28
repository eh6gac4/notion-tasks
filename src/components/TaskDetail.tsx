"use client"

import { useTransition, useState, useEffect, useRef, useMemo, type CSSProperties } from "react"
import type { Task, TaskAttachment, TaskComment, TaskStatus, TaskPriority } from "@/types/task"
import { updateTaskAction, getTaskBlocksAction, updateTaskBlocksAction, getTaskCommentsAction, createTaskCommentAction, getTasksByIdsAction, uploadTaskAttachmentAction, removeTaskAttachmentAction } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES, STATUS_ACCENT } from "@/constants/styles"
import { TaskFormSheet } from "./TaskFormSheet"
import { TaskPickerModal } from "./TaskPickerModal"
import { MarkdownPreview } from "./MarkdownPreview"
import { MailViewer } from "./MailViewer"
import { parseDue, buildDue, snapTimeTo5Min, formatDueShort } from "@/lib/due-date"
import { DueDateTimeInput } from "./DueDateTimeInput"
import { TagSelector } from "./TagSelector"
import { useTasksRefresh } from "./TasksRefreshContext"

export function TaskDetail({ task, tagOptions, locationOptions = [], allTasks = [], onSelectTask = () => {}, onClose }: {
  task: Task
  tagOptions: string[]
  locationOptions?: string[]
  allTasks?: Task[]
  onSelectTask?: (task: Task) => void
  onClose: () => void
}) {
  const [, startTransition] = useTransition()
  const [visible, setVisible] = useState(false)
  const refreshTasks = useTasksRefresh()

  // 子/親タスク解決: in-memory の allTasks から引き、欠落 ID (完了/中止など
  // lazy fetch 未取得) は getTasksByIdsAction で補完する。
  const [extraTasks, setExtraTasks] = useState<Record<string, Task>>({})
  const [subtaskFormOpen, setSubtaskFormOpen] = useState(false)
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const [prevPickerOpen, setPrevPickerOpen] = useState(false)
  const [nextPickerOpen, setNextPickerOpen] = useState(false)
  const [prevTaskFormOpen, setPrevTaskFormOpen] = useState(false)
  const [nextTaskFormOpen, setNextTaskFormOpen] = useState(false)

  const taskById = useMemo(() => {
    const m = new Map<string, Task>()
    for (const t of allTasks) m.set(t.id, t)
    for (const t of Object.values(extraTasks)) m.set(t.id, t)
    return m
  }, [allTasks, extraTasks])

  const childIds = useMemo(() => {
    const s = new Set<string>(task.childTaskIds)
    for (const t of allTasks) if (t.parentTaskIds.includes(task.id)) s.add(t.id)
    s.delete(task.id)
    return [...s]
  }, [task.id, task.childTaskIds, allTasks])

  const parentIds = task.parentTaskIds || []
  const prevIds = task.prevTaskIds || []
  const nextIds = task.nextTaskIds || []

  const childTasks = childIds
    .map((id) => taskById.get(id))
    .filter((t): t is Task => t !== undefined)
  const parentTasks = parentIds
    .map((id) => taskById.get(id))
    .filter((t): t is Task => t !== undefined)
  const prevTasks = prevIds
    .map((id) => taskById.get(id))
    .filter((t): t is Task => t !== undefined)
  const nextTasks = nextIds
    .map((id) => taskById.get(id))
    .filter((t): t is Task => t !== undefined)

  useEffect(() => {
    const need = [...childIds, ...parentIds, ...prevIds, ...nextIds].filter((id) => !taskById.has(id))
    if (need.length === 0) return
    let cancelled = false
    try {
      Promise.resolve(getTasksByIdsAction(need))
        .then((res) => {
          if (cancelled || res.length === 0) return
          setExtraTasks((prev) => {
            const next = { ...prev }
            for (const t of res) next[t.id] = t
            return next
          })
        })
        .catch(() => {})
    } catch {
      // action 未提供 (テスト等) — 無視
    }
    return () => { cancelled = true }
  }, [childIds, parentIds, prevIds, nextIds, taskById])

  const [editTitle, setEditTitle] = useState(task.title)
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status ?? "未着手")
  const [editPriority, setEditPriority] = useState<TaskPriority | "">(task.priority ?? "")
  const initialDue = parseDue(task.due)
  const [editDate, setEditDate] = useState(initialDue.date)
  const [editTime, setEditTime] = useState(snapTimeTo5Min(initialDue.time))
  const [editTags, setEditTags] = useState<string[]>(task.tags)
  const [editLocation, setEditLocation] = useState<string>(task.location ?? "")

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

  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments ?? [])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef(0)
  const dragYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const rafIdRef = useRef(0)
  const isEditingBlocksRef = useRef(isEditingBlocks)
  const isPCRef = useRef(false)
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

  // PC 判定（lg: ≥1024px）。matchMedia 非対応環境（jsdom 等）では false のまま
  useEffect(() => {
    isPCRef.current = typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 1024px)").matches
  }, [])

  // パネルの open/close アニメーションを直接 DOM に適用
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    if (isPCRef.current) {
      // PC: translateY アニメなし、opacity のみ
      el.style.transition = "opacity 0.15s"
      el.style.transform = "translateY(0)"
    } else {
      el.style.transition = "opacity 0.15s, transform 0.3s ease-out"
      el.style.transform = visible ? "translateY(0)" : "translateY(100%)"
    }
  }, [visible])

  const handleCloseRef = useRef<() => void>(() => {})
  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }
  useEffect(() => {
    handleCloseRef.current = handleClose
  })

  // スワイプダウンで閉じる（rAF で描画を間引き、setState なしで直接 DOM 操作）
  useEffect(() => {
    // PC ではタッチ操作を想定しないため無効化
    if (isPCRef.current) return
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setUploadError(null)
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const updated = await uploadTaskAttachmentAction(task.id, fd)
      setAttachments(updated)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteAttachment(index: number) {
    setIsDeletingIndex(index)
    setUploadError(null)
    try {
      const updated = await removeTaskAttachmentAction(task.id, index)
      setAttachments(updated)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "削除に失敗しました")
    } finally {
      setIsDeletingIndex(null)
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
    save({ priority: next || null })
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

  function handleLocationChange(next: string) {
    setEditLocation(next)
    save({ location: next || null })
  }

  const statusStyle = STATUS_STYLES[editStatus] ?? STATUS_STYLES["未着手"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center lg:p-6">
      <div
        data-testid="task-detail-backdrop"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        data-testid="task-detail"
        className="relative rounded-none-2xl px-4 pt-4 pb-8 max-h-[85svh] overflow-y-auto lg:rounded-none lg:w-full lg:max-w-2xl lg:max-h-[80vh] lg:pb-6 lg:border lg:border-[var(--border-strong)] lg:mx-auto"
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <button onClick={handleClose} className="w-full flex justify-center pb-2 -mt-1 lg:hidden">
          <div className="w-10 h-1 rounded-none" style={{ backgroundColor: "var(--border-strong)" }} />
        </button>

        {saveError && (
          <p className="text-xs text-[var(--status-cancel)] mb-4">{saveError}</p>
        )}

        {/* Title — blur で保存 */}
        <div className="flex items-center gap-3 mb-4">
          {task.icon && (
            task.icon.type === "emoji" ? (
              <span
                aria-hidden="true"
                className="flex-shrink-0 text-2xl leading-none"
              >
                {task.icon.emoji}
              </span>
            ) : (
              <img
                src={task.icon.url}
                alt=""
                className="flex-shrink-0 w-7 h-7 rounded-none object-cover"
              />
            )
          )}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => { if (editTitle.trim()) save({ title: editTitle }) }}
            className="field-sm flex-1 min-w-0 text-base"
            aria-label="タイトル"
          />
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <Row label="Status">
            <div className="relative inline-flex items-center">
              <span className={`inline-flex items-center h-9 px-3 rounded-none text-sm uppercase tracking-wider ${statusStyle}`}>
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
          </Row>

          <Row label="Priority">
            <select
              data-testid="priority-select"
              value={editPriority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority | "")}
              className="field-sm text-sm"
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

          <Row label="タグ" block>
            <TagSelector options={tagOptions} selected={editTags} onChange={handleTagsChange} />
          </Row>

          <Row label="場所">
            <select
              value={editLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="field-sm text-sm"
            >
              <option value="">未設定</option>
              {locationOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
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

          <Row label="親タスク" block>
            <div className="flex flex-col gap-2">
              {parentTasks.map((p) => (
                <RelatedTaskRow key={p.id} task={p} testid="parent-task-item" onClick={() => onSelectTask(p)} />
              ))}
              <button
                type="button"
                data-testid="parent-set-button"
                onClick={() => setParentPickerOpen(true)}
                className="font-pixel flex items-center justify-center gap-2 w-full rounded-none py-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] transition-colors tracking-widest uppercase"
                style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
              >
                {parentTasks.length > 0 ? "親タスクを変更" : "+ 親タスクを設定"}
              </button>
            </div>
          </Row>

          <div data-testid="subtask-section" className="space-y-4">
            <Row label="サブタスク" block>
              <div className="flex flex-col gap-2">
                {childTasks.map((c) => (
                  <RelatedTaskRow key={c.id} task={c} testid="subtask-item" onClick={() => onSelectTask(c)} />
                ))}
                {childTasks.length === 0 && (
                  <span className="text-sm text-[var(--text-faint)]">なし</span>
                )}
                <button
                  type="button"
                  data-testid="subtask-add-button"
                  onClick={() => setSubtaskFormOpen(true)}
                  className="font-pixel flex items-center justify-center gap-2 w-full rounded-none py-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] transition-colors tracking-widest uppercase"
                  style={{ border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }}
                >
                  + サブタスク追加
                </button>
              </div>
            </Row>

            <Row label="前タスク" block>
              <div className="flex flex-col gap-2">
                {prevTasks.map((t) => (
                  <RelatedTaskRow key={t.id} task={t} testid="prev-task-item" onClick={() => onSelectTask(t)} />
                ))}
                <LinkTaskButtons
                  testidPrefix="prev-task"
                  setLabel="+ 前タスクを設定"
                  createLabel="+ 前タスクを新規作成"
                  onSet={() => setPrevPickerOpen(true)}
                  onCreate={() => setPrevTaskFormOpen(true)}
                />
              </div>
            </Row>

            <Row label="次タスク" block>
              <div className="flex flex-col gap-2">
                {nextTasks.map((t) => (
                  <RelatedTaskRow key={t.id} task={t} testid="next-task-item" onClick={() => onSelectTask(t)} />
                ))}
                <LinkTaskButtons
                  testidPrefix="next-task"
                  setLabel="+ 次タスクを設定"
                  createLabel="+ 次タスクを新規作成"
                  onSet={() => setNextPickerOpen(true)}
                  onCreate={() => setNextTaskFormOpen(true)}
                />
              </div>
            </Row>
          </div>
        </div>

        {/* 本文 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 min-h-9">
            <span className="font-pixel text-xs text-[var(--text-faint)] tracking-wide uppercase">本文</span>
            {!isLoadingBlocks && !isEditingBlocks && (
              <button
                type="button"
                onClick={startEditingBlocks}
                className="font-pixel inline-flex items-center h-9 px-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors tracking-widest uppercase"
              >
                編集
              </button>
            )}
          </div>

          {blocksLoadError && !isEditingBlocks && (
            <p className="mb-4 text-xs text-[var(--status-cancel)]">{blocksLoadError}</p>
          )}

          {isLoadingBlocks ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-none border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
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
                className="field-sm w-full resize-none min-h-[120px] font-mono"
                placeholder="Markdownで入力（# 見出し、- リスト など）"
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBlocksSaveError(null)
                    setIsEditingBlocks(false)
                  }}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-none text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                  style={{ border: "1px solid var(--border-strong)" }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isSavingBlocks}
                  onClick={handleSaveBlocks}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-none text-xs text-[var(--bg)] font-semibold transition-all"
                  style={{ backgroundColor: isSavingBlocks ? "rgba(220,20,60,0.5)" : "var(--accent)" }}
                >
                  {isSavingBlocks ? "保存中…" : "保存"}
                </button>
              </div>
              {blocksSaveError && (
                <p className="mt-4 text-xs text-[var(--status-cancel)]">{blocksSaveError}</p>
              )}
            </div>
          ) : blocks ? (
            <MailViewer content={blocks} onToggleCheckbox={handleToggleCheckbox} />
          ) : (
            <p className="text-xs text-[var(--text-faint)] italic">本文なし</p>
          )}
        </div>

        {/* 添付ファイル */}
        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center justify-between mb-4 min-h-9">
            <div className="flex items-center">
              <span className="font-pixel text-xs text-[var(--text-faint)] tracking-wide uppercase">添付ファイル</span>
              {attachments.length > 0 && (
                <span className="ml-2 text-xs text-[var(--text-faint)]">({attachments.length})</span>
              )}
            </div>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="font-pixel inline-flex items-center h-9 px-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors tracking-widest uppercase disabled:opacity-40 disabled:pointer-events-none"
            >
              追加
            </button>
          </div>

          {isUploading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-none border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            </div>
          )}

          {uploadError && (
            <p className="mb-4 text-xs text-[var(--status-cancel)]">{uploadError}</p>
          )}

          {!isUploading && attachments.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] italic">添付ファイルなし</p>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) =>
                attachment.isImage ? (
                  <div key={index} className="relative flex flex-col items-center">
                    <div className="relative">
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-16 h-16 rounded-none object-cover"
                          style={{ border: "1px solid var(--border)" }}
                        />
                      </a>
                      <button
                        type="button"
                        disabled={isUploading || isDeletingIndex !== null}
                        onClick={() => handleDeleteAttachment(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-none flex items-center justify-center text-[10px] text-[var(--text-dim)] hover:text-[var(--status-cancel)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
                      >
                        {isDeletingIndex === index ? (
                          <span className="w-3 h-3 rounded-none border border-[var(--border-strong)] border-t-[var(--accent)] animate-spin block" />
                        ) : (
                          "×"
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] truncate w-16 text-center text-[var(--text-faint)] mt-1">
                      {attachment.name}
                    </span>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-none px-3 py-2"
                    style={{ border: "1px solid var(--border-strong)" }}
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors"
                      download={attachment.name}
                    >
                      <span className="max-w-[160px] truncate">{attachment.name}</span>
                      <span className="text-[var(--text-faint)]">→</span>
                    </a>
                    <button
                      type="button"
                      disabled={isUploading || isDeletingIndex !== null}
                      onClick={() => handleDeleteAttachment(index)}
                      className="flex items-center justify-center w-5 h-5 rounded-none text-[10px] text-[var(--text-faint)] hover:text-[var(--status-cancel)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isDeletingIndex === index ? (
                        <span className="w-3 h-3 rounded-none border border-[var(--border-strong)] border-t-[var(--accent)] animate-spin block" />
                      ) : (
                        "×"
                      )}
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* コメント */}
        <div className="mt-4">
          <div className="flex items-center mb-4 min-h-9">
            <span className="font-pixel text-xs text-[var(--text-faint)] tracking-wide uppercase">コメント</span>
            {comments.length > 0 && (
              <span className="ml-2 text-xs text-[var(--text-faint)]">({comments.length})</span>
            )}
          </div>

          {commentsLoadError && (
            <p className="mb-4 text-xs text-[var(--status-cancel)]">{commentsLoadError}</p>
          )}

          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-none border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {comments.length === 0 && (
                <p className="text-xs text-[var(--text-faint)] italic">コメントなし</p>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-none px-4 py-3"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-4">
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
              className="field-sm w-full resize-none min-h-[64px]"
            />
            <div className="flex justify-end mt-4">
              <button
                type="button"
                disabled={isPostingComment || !commentInput.trim()}
                onClick={handlePostComment}
                className="inline-flex items-center justify-center h-9 px-4 rounded-none text-xs text-[var(--bg)] font-semibold transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {isPostingComment ? "投稿中…" : "投稿"}
              </button>
            </div>
            {commentPostError && (
              <p className="mt-4 text-xs text-[var(--status-cancel)]">{commentPostError}</p>
            )}
          </div>
        </div>

        {/* Notion link — D1 で新規作成したタスクは url が空なので出さない */}
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel mt-4 flex items-center justify-center gap-2 w-full rounded-none py-3 text-sm text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] transition-colors tracking-widest uppercase"
            style={{ border: "1px solid var(--border-strong)" }}
          >
            Open in Notion →
          </a>
        )}
      </div>

      <TaskFormSheet
        open={subtaskFormOpen}
        onClose={() => setSubtaskFormOpen(false)}
        tagOptions={tagOptions}
        parentTaskId={task.id}
        heading="✦ New Subtask"
        submitLabel="ADD SUBTASK"
      />

      <TaskFormSheet
        open={prevTaskFormOpen}
        onClose={() => setPrevTaskFormOpen(false)}
        tagOptions={tagOptions}
        nextTaskId={task.id}
        heading="✦ New Prev Task"
        submitLabel="ADD PREV TASK"
      />

      <TaskFormSheet
        open={nextTaskFormOpen}
        onClose={() => setNextTaskFormOpen(false)}
        tagOptions={tagOptions}
        prevTaskId={task.id}
        heading="✦ New Next Task"
        submitLabel="ADD NEXT TASK"
      />

      <TaskPickerModal
        open={parentPickerOpen}
        onClose={() => setParentPickerOpen(false)}
        title="親タスクを設定"
        allTasks={allTasks}
        selectedIds={parentIds}
        excludedIds={useMemo(() => collectExcludedIds(task.id, allTasks), [task.id, allTasks])}
        multiple={false}
        onClear={() => save({ parentTaskIds: [] })}
        clearLabel="親を解除"
        onSave={(ids) => save({ parentTaskIds: ids })}
      />

      <TaskPickerModal
        open={prevPickerOpen}
        onClose={() => setPrevPickerOpen(false)}
        title="前タスクを設定"
        allTasks={allTasks}
        selectedIds={prevIds}
        excludedIds={new Set([task.id])}
        onSave={(ids) => save({ prevTaskIds: ids })}
      />

      <TaskPickerModal
        open={nextPickerOpen}
        onClose={() => setNextPickerOpen(false)}
        title="次タスクを設定"
        allTasks={allTasks}
        selectedIds={nextIds}
        excludedIds={new Set([task.id])}
        onSave={(ids) => save({ nextTaskIds: ids })}
      />
    </div>
  )
}

function LinkTaskButtons({
  testidPrefix,
  setLabel,
  createLabel,
  onSet,
  onCreate,
}: {
  testidPrefix: string
  setLabel: string
  createLabel: string
  onSet: () => void
  onCreate: () => void
}) {
  const buttonClassName = "font-pixel flex-1 flex items-center justify-center gap-2 w-full rounded-none py-3 text-xs text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] transition-colors tracking-widest uppercase"
  const buttonStyle = { border: "1px solid var(--border-strong)", minHeight: "var(--tap-min)" }
  return (
    <div className="flex gap-2">
      <button type="button" data-testid={`${testidPrefix}-set-button`} onClick={onSet} className={buttonClassName} style={buttonStyle}>
        {setLabel}
      </button>
      <button type="button" data-testid={`${testidPrefix}-create-button`} onClick={onCreate} className={buttonClassName} style={buttonStyle}>
        {createLabel}
      </button>
    </div>
  )
}

function RelatedTaskRow({
  task,
  onClick,
  testid,
}: {
  task: Task
  onClick: () => void
  testid: string
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      data-task-id={task.id}
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left rounded-none border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 hover:border-[var(--border-accent)] transition-colors"
      style={{ minHeight: "var(--tap-min)" }}
    >
      {task.icon && (
        task.icon.type === "emoji" ? (
          <span aria-hidden="true" className="flex-shrink-0 text-base leading-none">{task.icon.emoji}</span>
        ) : (
          <img src={task.icon.url} alt="" className="flex-shrink-0 w-4 h-4 rounded-none object-cover" />
        )
      )}
      <span className="flex-1 min-w-0 text-sm text-[var(--text)] break-words">{task.title}</span>
      <span
        aria-hidden="true"
        className="status-dot flex-shrink-0"
        style={{ "--status-color": STATUS_ACCENT[task.status ?? "未着手"] } as CSSProperties}
      />
    </button>
  )
}

function Row({
  label,
  children,
  block = false,
}: {
  label: string
  children: React.ReactNode
  block?: boolean
}) {
  return (
    <div className={`flex gap-4 ${block ? "items-start" : "items-center min-h-9"}`}>
      <span
        className={`font-pixel text-xs text-[var(--text-faint)] w-20 flex-shrink-0 tracking-wide uppercase ${block ? "pt-2" : ""}`}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// 自タスク + その子孫を候補から除外する（循環防止）。
function collectExcludedIds(rootId: string, allTasks: Task[]): Set<string> {
  const byId = new Map(allTasks.map((t) => [t.id, t]))
  const excluded = new Set<string>([rootId])
  const queue: string[] = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const node = byId.get(id)
    const childIds = new Set<string>(node?.childTaskIds ?? [])
    for (const t of allTasks) {
      if (t.parentTaskIds.includes(id)) childIds.add(t.id)
    }
    for (const cid of childIds) {
      if (!excluded.has(cid)) {
        excluded.add(cid)
        queue.push(cid)
      }
    }
  }
  return excluded
}
