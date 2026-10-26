// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { getTaskStore } from "../index"
import { createFakeD1, createFakeR2 } from "./fakeD1"

const { getContext, isDevMode } = vi.hoisted(() => ({
  getContext: vi.fn(),
  isDevMode: vi.fn(),
}))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: getContext }))
vi.mock("@/lib/require-auth", () => ({ isDevMode }))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

describe("getTaskStore", () => {
  it("開発時はCloudflareの接続なしでタスクと本文を保存できる", async () => {
    isDevMode.mockReturnValue(true)
    const store = await getTaskStore()
    const task = await store.createTask({ title: "開発用", body: "本文" })
    await store.updateTask(task.id, { title: "更新済み" })
    expect((await store.getTask(task.id))?.title).toBe("更新済み")
    expect(await store.getTaskBlocks(task.id)).toBe("本文")
    expect(getContext).not.toHaveBeenCalled()
  })

  it("本番は旧設定が残っていてもD1に保存する", async () => {
    isDevMode.mockReturnValue(false)
    vi.stubEnv("TASK_STORE", "notion")
    getContext.mockReturnValue({ env: { DB: createFakeD1(), ATTACHMENTS: createFakeR2() } })
    const store = await getTaskStore()
    const task = await store.createTask({ title: "本番用", body: "永続化する本文" })
    expect((await store.getTask(task.id))?.title).toBe("本番用")
    expect(await store.getTaskBlocks(task.id)).toBe("永続化する本文")
  })

  it("D1の設定がない本番環境では明示的に失敗する", async () => {
    isDevMode.mockReturnValue(false)
    getContext.mockReturnValue({ env: {} })
    await expect(getTaskStore()).rejects.toThrow("D1 バインディング DB がありません")
  })
})
