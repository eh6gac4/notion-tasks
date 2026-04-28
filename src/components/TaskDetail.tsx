"use client"

import { useTransition, useState, useEffect, useRef } from "react"
import type { Task, TaskComment, TaskStatus, TaskPriority } from "@/types/task"
import { updateTaskAction, getTaskBlocksAction, updateTaskBlocksAction, getTaskCommentsAction, createTaskCommentAction } from "@/app/actions"
import { STATUS_OPTIONS, STATUS_STYLES } from "@/constants/styles"
import { MarkdownPreview } from "./MarkdownPreview"
import { parseDue, buildDue, snapTimeTo5Min, formatDueShort } from "@/lib/due-date"
import { DueDateTimeInput } from "./DueDateTimeInput"

export function TaskDetail({ task, tagOptions, onClose }: { task: Task; tagOptions: string[]; onClose: () => void }) {
  const [, startTransition] = useTransition()
  const [visible, setVisible] = useState(false)

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
      setBlocks(editBlocksContent)
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

  function toggleTag(tag: string) {
    const next = editTags.includes(tag)
      ? editTags.filter((t) => t !== tag)
      : [...editTags, tag]
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
        className="relative rounded-t-2xl px-5 pt-4 pb-10 max-h-[85svh] overflow-y-auto"
        style={{
          backgroundColor: "#160022",
          borderTop: "1px solid rgba(255,0,204,0.5)",
          boxShadow: "0 -4px 30px rgba(255,0,204,0.2)",
        }}
      >
        {/* Handle */}
        <button onClick={handleClose} className="w-full flex justify-center pb-2 -mt-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,0,204,0.4)" }} />
        </button>

        {saveError && (
          <p className="text-xs text-[#ff3355] mb-4">{saveError}</p>
        )}

        {/* Title — blur で保存 */}
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => { if (editTitle.trim()) save({ title: editTitle }) }}
          className="w-full rounded-xl border border-[rgba(255,0,204,0.3)] px-4 py-3 text-sm text-[#ffbbee] bg-[#0d0014] placeholder:text-[#553355] focus:outline-none focus:border-[#ff00cc] mb-4"
          style={{ transition: "border-color 0.2s" }}
          aria-label="タイトル"
        />

        {/* Status */}
        <div className="mb-4">
          <p className="text-xs text-[#996688] mb-2 tracking-widest uppercase">Status</p>
          <div className="relative inline-flex">
            <span className={`px-3 py-2 rounded-full text-sm ${statusStyle}`}>
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
              className="rounded-xl px-3 py-2 text-sm bg-[#0d0014] text-[#ffbbee] focus:outline-none"
              style={{ border: "1px solid rgba(255,0,204,0.3)" }}
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
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-2 rounded-full text-xs transition-all"
                  style={
                    editTags.includes(tag)
                      ? { backgroundColor: "#ff00cc", color: "#0d0014", border: "1px solid transparent", boxShadow: "0 0 8px rgba(255,0,204,0.5)" }
                      : { backgroundColor: "#0d0014", color: "#996688", border: "1px solid rgba(255,0,204,0.2)" }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </Row>

          {task.source && (
            <Row label="ソース">
              <span className="text-sm text-[#ffbbee]">{task.source}</span>
            </Row>
          )}

          {task.sourceUrl && (
            <Row label="URL">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#ff00cc] underline break-all hover:text-[#ffaaee]">
                {task.sourceUrl}
              </a>
            </Row>
          )}

          {task.childTaskIds.length > 0 && (
            <Row label="子タスク">
              <span className="text-sm text-[#ffbbee]">{task.childTaskIds.length}件</span>
            </Row>
          )}

          {task.parentTaskIds.length > 0 && (
            <Row label="親タスク">
              <span className="text-sm text-[#ffbbee]">{task.parentTaskIds.length}件</span>
            </Row>
          )}
        </div>

        {/* 本文 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#996688] tracking-widest uppercase">本文</p>
            {!isLoadingBlocks && !isEditingBlocks && (
              <button
                type="button"
                onClick={startEditingBlocks}
                className="text-xs text-[#996688] hover:text-[#ff00cc] transition-colors tracking-widest uppercase"
              >
                編集
              </button>
            )}
          </div>

          {blocksLoadError && !isEditingBlocks && (
            <p className="mb-2 text-xs text-[#ff77aa]">{blocksLoadError}</p>
          )}

          {isLoadingBlocks ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[rgba(255,0,204,0.3)] border-t-[#ff00cc] animate-spin" />
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
                className="w-full rounded-xl px-4 py-3 text-sm text-[#ffbbee] bg-[#0d0014] focus:outline-none focus:border-[#ff00cc] resize-none min-h-[120px] font-mono"
                style={{ border: "1px solid rgba(255,0,204,0.3)" }}
                placeholder="Markdownで入力（# 見出し、- リスト など）"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBlocksSaveError(null)
                    setIsEditingBlocks(false)
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-[#996688] hover:text-[#ffbbee] transition-colors"
                  style={{ border: "1px solid rgba(255,0,204,0.2)" }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isSavingBlocks}
                  onClick={handleSaveBlocks}
                  className="px-4 py-2 rounded-xl text-xs text-[#0d0014] transition-all"
                  style={{ backgroundColor: isSavingBlocks ? "rgba(255,0,204,0.5)" : "#ff00cc" }}
                >
                  {isSavingBlocks ? "保存中…" : "保存"}
                </button>
              </div>
              {blocksSaveError && (
                <p className="mt-2 text-xs text-[#ff77aa]">{blocksSaveError}</p>
              )}
            </div>
          ) : blocks ? (
            <MarkdownPreview content={blocks} onToggleCheckbox={handleToggleCheckbox} />
          ) : (
            <p className="text-xs text-[#553355] italic">本文なし</p>
          )}
        </div>

        {/* コメント */}
        <div className="mt-6">
          <p className="text-xs text-[#996688] mb-3 tracking-widest uppercase">
            コメント{comments.length > 0 && <span className="ml-2 text-[#553355]">({comments.length})</span>}
          </p>

          {commentsLoadError && (
            <p className="mb-2 text-xs text-[#ff77aa]">{commentsLoadError}</p>
          )}

          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[rgba(255,0,204,0.3)] border-t-[#ff00cc] animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.length === 0 && (
                <p className="text-xs text-[#553355] italic">コメントなし</p>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: "#0d0014", border: "1px solid rgba(255,0,204,0.15)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#ff00cc]">{c.author}</span>
                    <span className="text-xs text-[#553355]">·</span>
                    <span className="text-xs text-[#553355]">
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
              className="w-full rounded-xl px-4 py-3 text-sm text-[#ffbbee] bg-[#0d0014] focus:outline-none focus:border-[#ff00cc] resize-none font-mono"
              style={{ border: "1px solid rgba(255,0,204,0.3)" }}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                disabled={isPostingComment || !commentInput.trim()}
                onClick={handlePostComment}
                className="px-4 py-2 rounded-xl text-xs text-[#0d0014] transition-all disabled:opacity-40"
                style={{ backgroundColor: "#ff00cc" }}
              >
                {isPostingComment ? "投稿中…" : "投稿"}
              </button>
            </div>
            {commentPostError && (
              <p className="mt-1 text-xs text-[#ff77aa]">{commentPostError}</p>
            )}
          </div>
        </div>

        {/* Notion link */}
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm text-[#996688] hover:text-[#ff00cc] transition-colors tracking-widest uppercase"
          style={{ border: "1px solid rgba(255,0,204,0.25)" }}
        >
          Open in Notion →
        </a>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#553355] w-16 flex-shrink-0 pt-1 tracking-wide">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
