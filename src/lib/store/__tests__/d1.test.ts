// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest"
import type { D1Database, R2Bucket } from "@cloudflare/workers-types"
import { D1TaskStore } from "../d1"
import { createFakeD1, createFakeR2 } from "./fakeD1"

describe("D1TaskStore", () => {
  let db: D1Database
  let bucket: R2Bucket & { store: Map<string, ArrayBuffer> }
  let store: D1TaskStore

  beforeEach(() => {
    db = createFakeD1()
    bucket = createFakeR2()
    store = new D1TaskStore(db, bucket)
  })

  it("作成したタスクをそのまま読み戻せる", async () => {
    const created = await store.createTask({
      title: "ルーターのファームウェア更新",
      status: "未着手",
      priority: "high",
      due: "2026-09-01",
      tags: ["home", "network"],
      location: "自宅",
      body: "## 手順\n- 管理画面を開く",
    })

    const task = await store.getTask(created.id)
    expect(task).not.toBeNull()
    expect(task!.title).toBe("ルーターのファームウェア更新")
    expect(task!.status).toBe("未着手")
    expect(task!.priority).toBe("high")
    expect(task!.due).toBe("2026-09-01")
    expect(task!.location).toBe("自宅")
    expect(task!.tags.sort()).toEqual(["home", "network"])
    expect(await store.getTaskBlocks(created.id)).toBe("## 手順\n- 管理画面を開く")
  })

  it("D1 で新規作成したタスクの url は空 (Notion リンクを持たない)", async () => {
    const created = await store.createTask({ title: "x" })
    expect(created.url).toBe("")
  })

  it("親タスクの指定が子タスク側からも逆引きできる", async () => {
    const parent = await store.createTask({ title: "親" })
    const child = await store.createTask({ title: "子", parentTaskId: parent.id })

    expect((await store.getTask(child.id))!.parentTaskIds).toEqual([parent.id])
    expect((await store.getTask(parent.id))!.childTaskIds).toEqual([child.id])
  })

  it("次タスクの指定が前タスク側からも逆引きできる", async () => {
    const first = await store.createTask({ title: "1" })
    const second = await store.createTask({ title: "2", prevTaskId: first.id })

    expect((await store.getTask(second.id))!.prevTaskIds).toEqual([first.id])
    expect((await store.getTask(first.id))!.nextTaskIds).toEqual([second.id])
  })

  it("nextTaskIds の更新が相手側の prevTaskIds に反映される", async () => {
    const a = await store.createTask({ title: "a" })
    const b = await store.createTask({ title: "b" })

    await store.updateTask(a.id, { nextTaskIds: [b.id] })

    expect((await store.getTask(a.id))!.nextTaskIds).toEqual([b.id])
    expect((await store.getTask(b.id))!.prevTaskIds).toEqual([a.id])
  })

  it("tags の更新は置き換えになる", async () => {
    const created = await store.createTask({ title: "t", tags: ["old-1", "old-2"] })
    await store.updateTask(created.id, { tags: ["new"] })
    expect((await store.getTask(created.id))!.tags).toEqual(["new"])
  })

  it("未指定のフィールドは updateTask で変化しない", async () => {
    const created = await store.createTask({ title: "t", status: "進行中", priority: "low" })
    await store.updateTask(created.id, { title: "t2" })

    const task = (await store.getTask(created.id))!
    expect(task.title).toBe("t2")
    expect(task.status).toBe("進行中")
    expect(task.priority).toBe("low")
  })

  it("priority を null に落とせる", async () => {
    const created = await store.createTask({ title: "t", priority: "high" })
    await store.updateTask(created.id, { priority: null })
    expect((await store.getTask(created.id))!.priority).toBeNull()
  })

  it("getTasks は指定ステータスだけを優先度順に返す", async () => {
    await store.createTask({ title: "low", status: "未着手", priority: "low" })
    await store.createTask({ title: "high", status: "未着手", priority: "high" })
    await store.createTask({ title: "done", status: "完了", priority: "high" })

    const tasks = await store.getTasks({ statuses: ["未着手"] })
    expect(tasks.map((t) => t.title)).toEqual(["high", "low"])
  })

  it("getTasks の既定ステータスは完了を含まない", async () => {
    await store.createTask({ title: "open", status: "未着手" })
    await store.createTask({ title: "done", status: "完了" })

    const tasks = await store.getTasks()
    expect(tasks.map((t) => t.title)).toEqual(["open"])
  })

  it("期限なしのタスクは期限つきより後ろに来る", async () => {
    await store.createTask({ title: "なし", status: "未着手" })
    await store.createTask({ title: "あり", status: "未着手", due: "2026-09-01" })

    const tasks = await store.getTasks({ statuses: ["未着手"] })
    expect(tasks.map((t) => t.title)).toEqual(["あり", "なし"])
  })

  it("コメントを追加して作成順に読み出せる", async () => {
    const task = await store.createTask({ title: "t" })
    await store.createTaskComment(task.id, "1つ目", "ctoshiki")
    await store.createTaskComment(task.id, "2つ目")

    const comments = await store.getTaskComments(task.id)
    expect(comments.map((c) => c.text)).toEqual(["1つ目", "2つ目"])
    expect(comments[0].author).toBe("ctoshiki")
    expect(comments[1].author).toBe("Unknown")
  })

  it("本文の更新が getTaskBlocks に反映される", async () => {
    const task = await store.createTask({ title: "t", body: "before" })
    await store.updateTaskBlocks(task.id, "after")
    expect(await store.getTaskBlocks(task.id)).toBe("after")
  })

  it("タグ/場所の選択肢を option_sets から返す", async () => {
    await db.prepare(`INSERT INTO option_sets (kind, value, sort_order) VALUES ('tag', 'work', 0)`).run()
    await db.prepare(`INSERT INTO option_sets (kind, value, sort_order) VALUES ('tag', 'home', 1)`).run()
    await db.prepare(`INSERT INTO option_sets (kind, value, sort_order) VALUES ('location', 'オフィス', 0)`).run()

    expect(await store.getTagOptions()).toEqual(["work", "home"])
    expect(await store.getLocationOptions()).toEqual(["オフィス"])
  })

  it("保存で使われたタグ/場所が option_sets に自動登録される", async () => {
    await store.createTask({ title: "t", tags: ["新タグ"], location: "新拠点" })
    expect(await store.getTagOptions()).toEqual(["新タグ"])
    expect(await store.getLocationOptions()).toEqual(["新拠点"])

    const t = await store.createTask({ title: "u" })
    await store.updateTask(t.id, { tags: ["新タグ", "追加タグ"], location: "別拠点" })
    expect(await store.getTagOptions()).toEqual(["新タグ", "追加タグ"])
    expect(await store.getLocationOptions()).toEqual(["新拠点", "別拠点"])
  })

  describe("添付ファイル", () => {
    const file = (name: string, body = "hello") =>
      new File([body], name, { type: "text/plain" })

    it("アップロードすると R2 に置かれ、一覧に出る", async () => {
      const task = await store.createTask({ title: "t" })
      const attachments = await store.uploadTaskAttachment(task.id, file("memo.txt"))

      expect(attachments).toHaveLength(1)
      expect(attachments[0].name).toBe("memo.txt")
      expect(attachments[0].isImage).toBe(false)
      expect(attachments[0].url).toMatch(new RegExp(`^/api/file/${task.id}/0\\?v=`))
      expect(bucket.store.size).toBe(1)
    })

    it("画像は isImage が立つ", async () => {
      const task = await store.createTask({ title: "t" })
      const attachments = await store.uploadTaskAttachment(task.id, file("shot.png"))
      expect(attachments[0].isImage).toBe(true)
    })

    it("削除すると R2 の実体も消え、以降のインデックスが詰まる", async () => {
      const task = await store.createTask({ title: "t" })
      await store.uploadTaskAttachment(task.id, file("a.txt"))
      await store.uploadTaskAttachment(task.id, file("b.txt"))

      const remaining = await store.removeTaskAttachment(task.id, 0)
      expect(remaining.map((a) => a.name)).toEqual(["b.txt"])
      expect(bucket.store.size).toBe(1)
      expect(remaining[0].url).toContain(`/api/file/${task.id}/0`)
    })

    it("readAttachment が実体を返す", async () => {
      const task = await store.createTask({ title: "t" })
      await store.uploadTaskAttachment(task.id, file("memo.txt", "本文"))

      const read = await store.readAttachment(task.id, 0)
      expect(read).not.toBeNull()
      expect(read!.name).toBe("memo.txt")
      expect(read!.contentType).toBe("text/plain")
      expect(new TextDecoder().decode(read!.data)).toBe("本文")
    })

    it("存在しないインデックスの削除は失敗する", async () => {
      const task = await store.createTask({ title: "t" })
      await expect(store.removeTaskAttachment(task.id, 3)).rejects.toThrow(/添付ファイルが見つかりません/)
    })
  })
})
