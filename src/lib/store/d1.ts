import type { D1Database, R2Bucket } from "@cloudflare/workers-types"
import { IMAGE_EXT_RE, INITIAL_STATUSES, PRIORITY_ORDER } from "@/constants/task"
import type {
  CreateTaskInput,
  Task,
  TaskAttachment,
  TaskComment,
  TaskIcon,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task"
import type { AttachmentReadableStore, TaskStore } from "./types"

/** 添付ファイル 1 件あたりの上限 (Notion 実装と合わせる) */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

type TaskRow = {
  id: string
  notion_url: string
  title: string
  icon_type: "emoji" | "url" | null
  icon_value: string | null
  status: string | null
  priority: string | null
  due: string | null
  location: string | null
  source: string | null
  source_url: string | null
  created_time: string
  last_edited_time: string
}

type AttachmentRow = {
  id: string
  task_id: string
  sort_order: number
  name: string
  r2_key: string
  content_type: string
  size: number
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ")
}

function rowToIcon(row: TaskRow): TaskIcon | null {
  if (row.icon_type === "emoji" && row.icon_value) return { type: "emoji", emoji: row.icon_value }
  if (row.icon_type === "url" && row.icon_value) return { type: "url", url: row.icon_value }
  return null
}

/**
 * 添付の公開 URL。Notion 実装と同じ形にしておくことで
 * `/api/file/[pageId]/[index]` proxy route と UI をそのまま流用できる。
 */
function attachmentUrl(taskId: string, index: number, lastEditedTime: string): string {
  return `/api/file/${taskId}/${index}?v=${encodeURIComponent(lastEditedTime)}`
}

function toAttachments(rows: AttachmentRow[], taskId: string, lastEditedTime: string): TaskAttachment[] {
  return rows.map((r, index) => ({
    name: r.name,
    url: attachmentUrl(taskId, index, lastEditedTime),
    isImage: IMAGE_EXT_RE.test(r.name),
  }))
}

/**
 * Cloudflare D1 (+ 添付実体は R2) をバックエンドとする TaskStore 実装。
 *
 * Notion 実装との差分で意図的に変えている点:
 * - 本文は Markdown を `tasks.body` に丸ごと持つ (block 差分適用が不要になる)
 * - 親/子・前/次は有向辺 1 本 (`task_relations`) だけを持ち、逆方向は導出する
 * - 添付の署名 URL 問題が無いので、proxy route は R2 から直接返すだけになる
 */
export class D1TaskStore implements TaskStore, AttachmentReadableStore {
  constructor(
    private readonly db: D1Database,
    private readonly bucket?: R2Bucket,
  ) {}

  // --- 読み取り ---

  async getTasks(options?: { statuses?: TaskStatus[] }): Promise<Task[]> {
    const statuses = options?.statuses ?? INITIAL_STATUSES
    if (statuses.length === 0) return []

    const priorityRank = PRIORITY_ORDER.map((p, i) => `WHEN '${p}' THEN ${i}`).join(" ")
    const rows = await this.db
      .prepare(
        `SELECT * FROM tasks
         WHERE status IN (${placeholders(statuses.length)})
         ORDER BY CASE priority ${priorityRank} ELSE ${PRIORITY_ORDER.length} END,
                  due IS NULL, due ASC,
                  created_time ASC`,
      )
      .bind(...statuses)
      .all<TaskRow>()

    return this.hydrate(rows.results ?? [])
  }

  async getTask(id: string): Promise<Task | null> {
    const row = await this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).bind(id).first<TaskRow>()
    if (!row) return null
    const [task] = await this.hydrate([row])
    return task ?? null
  }

  /**
   * tasks 行に対して tag / assignee / relation / attachment をまとめて引き、
   * JS 側で組み立てる。行ごとに引くと D1 の往復が件数分増えるため、
   * 常に IN 句 1 回で取得する。
   */
  private async hydrate(rows: TaskRow[]): Promise<Task[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const ph = placeholders(ids.length)

    const [tagRes, assigneeRes, relOutRes, relInRes, attachRes] = await this.db.batch([
      this.db.prepare(`SELECT task_id, tag FROM task_tags WHERE task_id IN (${ph})`).bind(...ids),
      this.db.prepare(`SELECT task_id, assignee FROM task_assignees WHERE task_id IN (${ph})`).bind(...ids),
      this.db.prepare(`SELECT from_id, to_id, type FROM task_relations WHERE from_id IN (${ph})`).bind(...ids),
      this.db.prepare(`SELECT from_id, to_id, type FROM task_relations WHERE to_id IN (${ph})`).bind(...ids),
      this.db
        .prepare(`SELECT * FROM task_attachments WHERE task_id IN (${ph}) ORDER BY task_id, sort_order`)
        .bind(...ids),
    ])

    const tags = groupBy(tagRes.results as Array<{ task_id: string; tag: string }>, (r) => r.task_id, (r) => r.tag)
    const assignees = groupBy(
      assigneeRes.results as Array<{ task_id: string; assignee: string }>,
      (r) => r.task_id,
      (r) => r.assignee,
    )

    type Rel = { from_id: string; to_id: string; type: "parent" | "next" }
    const out = (relOutRes.results ?? []) as Rel[]
    const inn = (relInRes.results ?? []) as Rel[]

    // 有向辺 from → to を、両向きのプロパティに展開する。
    //   parent: from の親が to      → 逆引きは to の子が from
    //   next  : from の次が to      → 逆引きは to の前が from
    const parents = groupBy(out.filter((r) => r.type === "parent"), (r) => r.from_id, (r) => r.to_id)
    const children = groupBy(inn.filter((r) => r.type === "parent"), (r) => r.to_id, (r) => r.from_id)
    const nexts = groupBy(out.filter((r) => r.type === "next"), (r) => r.from_id, (r) => r.to_id)
    const prevs = groupBy(inn.filter((r) => r.type === "next"), (r) => r.to_id, (r) => r.from_id)

    const attachments = new Map<string, AttachmentRow[]>()
    for (const a of (attachRes.results ?? []) as AttachmentRow[]) {
      const list = attachments.get(a.task_id) ?? []
      list.push(a)
      attachments.set(a.task_id, list)
    }

    return rows.map((row) => ({
      id: row.id,
      url: row.notion_url,
      title: row.title,
      icon: rowToIcon(row),
      status: (row.status ?? null) as TaskStatus | null,
      priority: (row.priority ?? null) as TaskPriority | null,
      due: row.due,
      tags: tags.get(row.id) ?? [],
      location: row.location,
      assignees: assignees.get(row.id) ?? [],
      source: row.source,
      sourceUrl: row.source_url,
      parentTaskIds: parents.get(row.id) ?? [],
      childTaskIds: children.get(row.id) ?? [],
      prevTaskIds: prevs.get(row.id) ?? [],
      nextTaskIds: nexts.get(row.id) ?? [],
      createdTime: row.created_time,
      lastEditedTime: row.last_edited_time,
      attachments: toAttachments(attachments.get(row.id) ?? [], row.id, row.last_edited_time),
    }))
  }

  async getTagOptions(): Promise<string[]> {
    const res = await this.db
      .prepare(`SELECT value FROM option_sets WHERE kind = 'tag' ORDER BY sort_order, value`)
      .all<{ value: string }>()
    return (res.results ?? []).map((r) => r.value)
  }

  async getLocationOptions(): Promise<string[]> {
    const res = await this.db
      .prepare(`SELECT value FROM option_sets WHERE kind = 'location' ORDER BY sort_order, value`)
      .all<{ value: string }>()
    return (res.results ?? []).map((r) => r.value)
  }

  async getTaskBlocks(id: string): Promise<string> {
    const row = await this.db.prepare(`SELECT body FROM tasks WHERE id = ?`).bind(id).first<{ body: string }>()
    return row?.body ?? ""
  }

  // --- 書き込み ---

  async createTask(input: CreateTaskInput): Promise<Task> {
    const id = newId()
    const ts = nowIso()

    const statements = [
      this.db
        .prepare(
          `INSERT INTO tasks (id, notion_url, title, status, priority, due, location, source, source_url, body, created_time, last_edited_time)
           VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.title,
          input.status ?? null,
          input.priority ?? null,
          input.due ?? null,
          input.location ?? null,
          input.source ?? null,
          input.sourceUrl ?? null,
          input.body ?? "",
          ts,
          ts,
        ),
      ...this.tagStatements(id, input.tags ?? []),
      ...this.relationStatements(id, "parent", input.parentTaskId ? [input.parentTaskId] : []),
      ...this.relationStatements(id, "next", input.nextTaskId ? [input.nextTaskId] : []),
    ]

    // prevTaskId は「自分の前が X」= 「X の次が自分」なので辺の向きが逆になる。
    if (input.prevTaskId) {
      statements.push(
        this.db
          .prepare(`INSERT OR IGNORE INTO task_relations (from_id, to_id, type) VALUES (?, ?, 'next')`)
          .bind(input.prevTaskId, id),
      )
    }

    await this.db.batch(statements)

    const task = await this.getTask(id)
    if (!task) throw new Error(`createTask: 作成直後のタスクを読み戻せません (${id})`)
    return task
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const ts = nowIso()
    const sets: string[] = []
    const values: unknown[] = []

    const set = (col: string, value: unknown) => {
      sets.push(`${col} = ?`)
      values.push(value)
    }

    if (input.title !== undefined) set("title", input.title)
    if (input.status !== undefined) set("status", input.status)
    if (input.priority !== undefined) set("priority", input.priority ?? null)
    if (input.due !== undefined) set("due", input.due ?? null)
    if (input.location !== undefined) set("location", input.location ?? null)
    if (input.source !== undefined) set("source", input.source)
    if (input.sourceUrl !== undefined) set("source_url", input.sourceUrl)
    if (input.body !== undefined) set("body", input.body)
    set("last_edited_time", ts)

    const statements = [
      this.db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).bind(...values, id),
    ]

    if (input.tags !== undefined) {
      statements.push(this.db.prepare(`DELETE FROM task_tags WHERE task_id = ?`).bind(id))
      statements.push(...this.tagStatements(id, input.tags))
    }
    if (input.parentTaskIds !== undefined) {
      statements.push(
        this.db.prepare(`DELETE FROM task_relations WHERE from_id = ? AND type = 'parent'`).bind(id),
      )
      statements.push(...this.relationStatements(id, "parent", input.parentTaskIds))
    }
    if (input.nextTaskIds !== undefined) {
      statements.push(this.db.prepare(`DELETE FROM task_relations WHERE from_id = ? AND type = 'next'`).bind(id))
      statements.push(...this.relationStatements(id, "next", input.nextTaskIds))
    }
    if (input.prevTaskIds !== undefined) {
      // 前タスクは入ってくる辺なので to_id 側で張り替える。
      statements.push(this.db.prepare(`DELETE FROM task_relations WHERE to_id = ? AND type = 'next'`).bind(id))
      for (const prevId of input.prevTaskIds) {
        statements.push(
          this.db
            .prepare(`INSERT OR IGNORE INTO task_relations (from_id, to_id, type) VALUES (?, ?, 'next')`)
            .bind(prevId, id),
        )
      }
    }

    await this.db.batch(statements)

    const task = await this.getTask(id)
    if (!task) throw new Error(`updateTask: タスクが見つかりません (${id})`)
    return task
  }

  async updateTaskBlocks(id: string, markdown: string): Promise<void> {
    await this.db
      .prepare(`UPDATE tasks SET body = ?, last_edited_time = ? WHERE id = ?`)
      .bind(markdown, nowIso(), id)
      .run()
  }

  private tagStatements(taskId: string, tags: string[]) {
    return tags.map((tag) =>
      this.db.prepare(`INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)`).bind(taskId, tag),
    )
  }

  private relationStatements(fromId: string, type: "parent" | "next", toIds: string[]) {
    return toIds.map((toId) =>
      this.db
        .prepare(`INSERT OR IGNORE INTO task_relations (from_id, to_id, type) VALUES (?, ?, ?)`)
        .bind(fromId, toId, type),
    )
  }

  // --- コメント ---

  async getTaskComments(id: string): Promise<TaskComment[]> {
    const res = await this.db
      .prepare(`SELECT id, text, author, created_time FROM task_comments WHERE task_id = ? ORDER BY created_time`)
      .bind(id)
      .all<{ id: string; text: string; author: string; created_time: string }>()
    return (res.results ?? []).map((r) => ({
      id: r.id,
      text: r.text,
      author: r.author,
      createdTime: r.created_time,
    }))
  }

  async createTaskComment(id: string, text: string, author = "Unknown"): Promise<TaskComment> {
    const comment: TaskComment = { id: newId(), text, author, createdTime: nowIso() }
    await this.db
      .prepare(`INSERT INTO task_comments (id, task_id, text, author, created_time) VALUES (?, ?, ?, ?, ?)`)
      .bind(comment.id, id, comment.text, comment.author, comment.createdTime)
      .run()
    return comment
  }

  // --- 添付ファイル ---

  async uploadTaskAttachment(taskId: string, file: File): Promise<TaskAttachment[]> {
    if (!this.bucket) throw new Error("添付ファイル用の R2 バケットが設定されていません")
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`ファイルサイズが上限 (20 MB) を超えています: ${file.name}`)
    }

    const attachmentId = newId()
    const key = `tasks/${taskId}/${attachmentId}/${file.name}`
    const contentType = file.type || "application/octet-stream"

    // Workers ランタイムでは受信 multipart 由来の File がストリーム読み取り済みに
    // なり得るため、arrayBuffer() で実体化してから put する (Notion 実装と同じ理由)。
    const buf = await file.arrayBuffer()
    await this.bucket.put(key, buf, { httpMetadata: { contentType } })

    const next = await this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM task_attachments WHERE task_id = ?`)
      .bind(taskId)
      .first<{ next: number }>()

    const ts = nowIso()
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO task_attachments (id, task_id, sort_order, name, r2_key, content_type, size, created_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(attachmentId, taskId, next?.next ?? 0, file.name, key, contentType, file.size, ts),
      this.db.prepare(`UPDATE tasks SET last_edited_time = ? WHERE id = ?`).bind(ts, taskId),
    ])

    return this.listAttachments(taskId, ts)
  }

  async removeTaskAttachment(taskId: string, index: number): Promise<TaskAttachment[]> {
    const rows = await this.attachmentRows(taskId)
    const target = rows[index]
    if (!target) throw new Error(`添付ファイルが見つかりません (index=${index})`)

    if (this.bucket) await this.bucket.delete(target.r2_key)

    const ts = nowIso()
    await this.db.batch([
      this.db.prepare(`DELETE FROM task_attachments WHERE id = ?`).bind(target.id),
      this.db.prepare(`UPDATE tasks SET last_edited_time = ? WHERE id = ?`).bind(ts, taskId),
    ])

    return this.listAttachments(taskId, ts)
  }

  /** proxy route から添付の実体を返すためのフック */
  async readAttachment(taskId: string, index: number) {
    if (!this.bucket) return null
    const rows = await this.attachmentRows(taskId)
    const target = rows[index]
    if (!target) return null
    const object = await this.bucket.get(target.r2_key)
    if (!object) return null
    // 上限 20 MB なので全読みしてしまう。ストリームのまま返すと Workers の
    // ReadableStream と DOM の ReadableStream の型が噛み合わない。
    return { data: await object.arrayBuffer(), contentType: target.content_type, name: target.name }
  }

  private async attachmentRows(taskId: string): Promise<AttachmentRow[]> {
    const res = await this.db
      .prepare(`SELECT * FROM task_attachments WHERE task_id = ? ORDER BY sort_order`)
      .bind(taskId)
      .all<AttachmentRow>()
    return res.results ?? []
  }

  private async listAttachments(taskId: string, lastEditedTime: string): Promise<TaskAttachment[]> {
    return toAttachments(await this.attachmentRows(taskId), taskId, lastEditedTime)
  }
}

function groupBy<T, V>(rows: T[] | undefined, key: (row: T) => string, value: (row: T) => V): Map<string, V[]> {
  const map = new Map<string, V[]>()
  for (const row of rows ?? []) {
    const k = key(row)
    const list = map.get(k) ?? []
    list.push(value(row))
    map.set(k, list)
  }
  return map
}
