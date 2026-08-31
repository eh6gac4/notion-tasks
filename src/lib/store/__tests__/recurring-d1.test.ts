// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest"
import type { D1Database } from "@cloudflare/workers-types"
import { todayInTokyo } from "@/lib/recurrence"
import { buildDueForOccurrence } from "@/lib/recurring-plan"
import { D1TaskStore } from "../d1"
import { RecurringTaskStore } from "../recurring-d1"
import { createFakeD1 } from "./fakeD1"

describe("RecurringTaskStore", () => {
  let db: D1Database
  let tasks: D1TaskStore
  let store: RecurringTaskStore

  beforeEach(() => {
    db = createFakeD1()
    tasks = new D1TaskStore(db)
    store = new RecurringTaskStore(db, tasks)
  })

  it("作成したルールをそのまま読み戻せる", async () => {
    const created = await store.createRule({
      title: "ゴミ出し",
      freq: "weekly",
      byweekday: [1, 4],
      startDate: "2026-09-01",
      dueTime: "07:00",
      priority: "medium",
      location: "自宅",
      tags: ["home", "routine"],
      body: "## 分別\n- 燃えるゴミ",
    })

    const rule = await store.getRule(created.id)
    expect(rule).not.toBeNull()
    expect(rule!.title).toBe("ゴミ出し")
    expect(rule!.freq).toBe("weekly")
    expect(rule!.byweekday).toEqual([1, 4])
    expect(rule!.dueTime).toBe("07:00")
    expect(rule!.leadDays).toBe(0)
    expect(rule!.enabled).toBe(true)
    expect(rule!.tags.sort()).toEqual(["home", "routine"])
    expect(rule!.body).toBe("## 分別\n- 燃えるゴミ")
  })

  it("不正なルールは作成時に弾かれる", async () => {
    await expect(
      store.createRule({ title: "だめな例", freq: "daily", interval: 0, startDate: "2026-09-01" }),
    ).rejects.toThrow(/繰り返しルールが不正/)
  })

  it("更新は部分指定でき、タグは置き換えになる", async () => {
    const created = await store.createRule({
      title: "週次レビュー",
      freq: "weekly",
      byweekday: [5],
      startDate: "2026-09-01",
      tags: ["work"],
    })

    const updated = await store.updateRule(created.id, { title: "週次ふりかえり", tags: ["work", "review"] })
    expect(updated.title).toBe("週次ふりかえり")
    expect(updated.freq).toBe("weekly")
    expect(updated.byweekday).toEqual([5])
    expect(updated.tags.sort()).toEqual(["review", "work"])
  })

  it("更新後に不正になるルールは弾かれる", async () => {
    const created = await store.createRule({ freq: "weekly", byweekday: [5], title: "x", startDate: "2026-09-01" })
    await expect(store.updateRule(created.id, { freq: "daily" })).rejects.toThrow(/byweekday/)
  })

  it("ルールを消しても生成済みタスクは残る", async () => {
    const rule = await store.createRule({ title: "掃除", freq: "daily", startDate: "2026-09-01" })
    await store.generateDueTasks("2026-09-01")
    const before = await tasks.getTasks()
    expect(before.length).toBeGreaterThan(0)

    await store.deleteRule(rule.id)
    expect(await store.getRule(rule.id)).toBeNull()
    expect((await tasks.getTasks()).length).toBe(before.length)
  })

  describe("generateDueTasks", () => {
    it("ルールの内容をタスクに複写する", async () => {
      await store.createRule({
        title: "家賃の振込",
        freq: "monthly",
        bymonthday: 27,
        startDate: "2026-09-01",
        dueTime: "10:00",
        priority: "high",
        location: "銀行",
        tags: ["money"],
        body: "口座を確認する",
      })

      const result = await store.generateDueTasks("2026-09-27")
      expect(result.created).toBe(1)

      const [task] = await tasks.getTasks()
      expect(task.title).toBe("家賃の振込")
      expect(task.status).toBe("未着手")
      expect(task.priority).toBe("high")
      expect(task.due).toBe("2026-09-27T10:00:00.000+09:00")
      expect(task.location).toBe("銀行")
      expect(task.tags).toEqual(["money"])
      expect(await tasks.getTaskBlocks(task.id)).toBe("口座を確認する")
    })

    it("時刻未指定なら期日は日付のみになる", async () => {
      await store.createRule({ title: "点検", freq: "daily", startDate: "2026-09-10" })
      await store.generateDueTasks("2026-09-10")
      const [task] = await tasks.getTasks()
      expect(task.due).toBe("2026-09-10")
    })

    it("二度実行しても重複しない", async () => {
      await store.createRule({ title: "水やり", freq: "daily", startDate: "2026-09-10" })

      const first = await store.generateDueTasks("2026-09-10")
      const second = await store.generateDueTasks("2026-09-10")

      expect(first.created).toBe(1)
      expect(second.created).toBe(0)
      expect((await tasks.getTasks()).length).toBe(1)
    })

    it("lead_days のぶんだけ先の回を前倒しで作る", async () => {
      await store.createRule({
        title: "健康診断の予約",
        freq: "monthly",
        bymonthday: 20,
        startDate: "2026-09-01",
        leadDays: 3,
      })

      // 3 日前なので 9/17 の実行で 9/20 ぶんが生える
      expect((await store.generateDueTasks("2026-09-16")).created).toBe(0)
      expect((await store.generateDueTasks("2026-09-17")).created).toBe(1)

      const [task] = await tasks.getTasks()
      expect(task.due).toBe("2026-09-20")
    })

    it("無効化したルールは生成されない", async () => {
      await store.createRule({ title: "止めた習慣", freq: "daily", startDate: "2026-09-10", enabled: false })
      expect((await store.generateDueTasks("2026-09-10")).created).toBe(0)
    })

    it("cron が数日落ちていた場合は取りこぼしを埋める", async () => {
      await store.createRule({ title: "日報", freq: "daily", startDate: "2026-09-10" })

      const result = await store.generateDueTasks("2026-09-13")
      expect(result.created).toBe(4) // 9/10, 9/11, 9/12, 9/13
      expect(result.perRule[0].dates).toEqual(["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"])
    })

    it("start_date が大昔でも遡りは 30 日ぶんで打ち止めになる", async () => {
      await store.createRule({ title: "昔からの習慣", freq: "daily", startDate: "2020-01-01" })
      const result = await store.generateDueTasks("2026-09-10")
      expect(result.created).toBe(31) // 8/11 〜 9/10
    })

    it("前回ぶんが未完了でも次の回を生成する", async () => {
      await store.createRule({ title: "溜まる用事", freq: "daily", startDate: "2026-09-10" })
      await store.generateDueTasks("2026-09-10")
      await store.generateDueTasks("2026-09-11")

      const all = await tasks.getTasks()
      expect(all.length).toBe(2)
      expect(all.every((t) => t.status === "未着手")).toBe(true)
    })

    it("生成済みタスクは台帳から辿れる", async () => {
      const rule = await store.createRule({ title: "追跡", freq: "daily", startDate: "2026-09-10" })
      await store.generateDueTasks("2026-09-10")

      const row = await db
        .prepare(`SELECT task_id FROM recurring_task_instances WHERE recurring_id = ? AND occurrence_date = ?`)
        .bind(rule.id, "2026-09-10")
        .first<{ task_id: string }>()

      const [task] = await tasks.getTasks()
      expect(row?.task_id).toBe(task.id)
    })
  })
})

describe("buildDueForOccurrence", () => {
  it("時刻があれば日本時間のオフセットを付ける", () => {
    expect(buildDueForOccurrence("2026-09-01", "18:00")).toBe("2026-09-01T18:00:00.000+09:00")
  })

  it("時刻がなければ日付のみを返す", () => {
    expect(buildDueForOccurrence("2026-09-01", null)).toBe("2026-09-01")
  })
})

describe("todayInTokyo", () => {
  it("UTC の日付が変わる前でも日本時間の日付を返す", () => {
    // 2026-09-01T16:00:00Z は日本時間で 2026-09-02 01:00
    expect(todayInTokyo(new Date("2026-09-01T16:00:00Z"))).toBe("2026-09-02")
    expect(todayInTokyo(new Date("2026-09-01T14:00:00Z"))).toBe("2026-09-01")
  })
})
