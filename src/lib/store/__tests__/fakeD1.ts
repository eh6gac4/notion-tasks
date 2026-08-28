import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"
import type { D1Database, R2Bucket } from "@cloudflare/workers-types"

/**
 * node:sqlite の上に D1 の使う分だけの API を被せたテスト用スタブ。
 * 実際の migrations/0001_init.sql をそのまま流し込むので、
 * スキーマと D1TaskStore の SQL が噛み合っているかまで検証できる。
 */
export function createFakeD1(): D1Database {
  const db = new DatabaseSync(":memory:")
  db.exec("PRAGMA foreign_keys = ON")
  db.exec(readFileSync(resolve("migrations/0001_init.sql"), "utf-8"))

  const makeStatement = (sql: string, values: unknown[] = []) => ({
    bind: (...next: unknown[]) => makeStatement(sql, next),
    all: async () => ({ results: db.prepare(sql).all(...(values as never[])) }),
    first: async () => db.prepare(sql).get(...(values as never[])) ?? null,
    run: async () => ({ success: true, meta: db.prepare(sql).run(...(values as never[])) }),
    // batch から同期実行するための内部フック
    __exec: () => db.prepare(sql).all(...(values as never[])),
  })

  return {
    prepare: (sql: string) => makeStatement(sql),
    batch: async (statements: Array<{ __exec: () => unknown }>) => {
      // D1 の batch は暗黙のトランザクション。失敗時に途中まで残らないことを再現する。
      db.exec("BEGIN")
      try {
        const results = statements.map((s) => ({ success: true, results: s.__exec() }))
        db.exec("COMMIT")
        return results
      } catch (e) {
        db.exec("ROLLBACK")
        throw e
      }
    },
  } as unknown as D1Database
}

/** put / get / delete だけの R2 スタブ */
export function createFakeR2(): R2Bucket & { store: Map<string, ArrayBuffer> } {
  const store = new Map<string, ArrayBuffer>()
  return {
    store,
    put: async (key: string, value: ArrayBuffer) => {
      store.set(key, value)
      return { key }
    },
    get: async (key: string) => {
      const value = store.get(key)
      if (!value) return null
      return { arrayBuffer: async () => value }
    },
    delete: async (key: string) => {
      store.delete(key)
    },
  } as unknown as R2Bucket & { store: Map<string, ArrayBuffer> }
}
