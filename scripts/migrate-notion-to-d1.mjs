#!/usr/bin/env node
// Notion → Cloudflare D1 のデータ移行スクリプト。
//
//   node scripts/migrate-notion-to-d1.mjs [--out .migration] [--limit N]
//
// 必要な環境変数 (.env.local から読む): NOTION_TOKEN
//
// 出力 (既定 .migration/):
//   0002_seed.sql          … tasks / tags / assignees / relations / comments / option_sets の INSERT
//   attachments/           … Notion からダウンロードした添付ファイルの実体
//   upload-attachments.sh  … 上記を R2 に put する wrangler コマンド列
//
// 適用手順:
//   npx wrangler d1 execute notion-tasks --remote --file=./migrations/0001_init.sql
//   npx wrangler d1 execute notion-tasks --remote --file=./.migration/0002_seed.sql
//   sh .migration/upload-attachments.sh
//
// 注意:
// * Notion API は 3 req/s 程度で絞られるため、本文・コメント取得は逐次 + ウェイト。
//   数百件で数分かかる。途中で失敗しても SQL 生成前なので再実行すれば良い。
// * id は Notion の page UUID をそのまま使う。リレーションが無変換で移る。
// * 書き込みは一切行わない (Notion 側は read-only)。

import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"
import { config as loadEnv } from "dotenv"
import { Client } from "@notionhq/client"

// 完了 / 中止 / 対応不要 / アーカイブ済み は移行しない
// (件数が多く、D1 では参照しない終端状態)。
// これらを親/次に持つリレーションは known セットの判定で自然にスキップされる。
const MIGRATED_STATUSES = [
  "バックログ", "未着手", "進行中", "確認中", "一時中断",
]

const NOTION_FILES_PROP = "添付ファイル"
const RATE_LIMIT_WAIT_MS = 350

const args = process.argv.slice(2)
const outDir = resolve(argValue("--out") ?? ".migration")
const limit = Number(argValue("--limit") ?? 0) || Infinity

function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- SQL ヘルパ ---

function sqlText(value) {
  if (value === null || value === undefined || value === "") return "NULL"
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlTextNotNull(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`
}

// --- 既存 TS 実装の再利用 ---
// src/lib/notion.ts の抽出ロジック・blocksToMarkdown をそのまま使いたいので、
// esbuild で 1 ファイルに束ねてから動的 import する。移行専用の変換を別に書くと
// 本番コードとズレて事故るため。
async function loadNotionLib() {
  const bundlePath = join(outDir, ".notion-lib.mjs")
  await build({
    entryPoints: [resolve("src/lib/notion.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
    external: ["@notionhq/client"],
    alias: { "@": resolve("src") },
    logLevel: "warning",
  })
  return import(pathToFileURL(bundlePath).href)
}

async function main() {
  loadEnv({ path: ".env.local", quiet: true })
  if (!process.env.NOTION_TOKEN) {
    console.error("NOTION_TOKEN が未設定です (.env.local を確認してください)")
    process.exit(1)
  }
  // src/lib/notion.ts は NODE_ENV=development だと mock を返すので明示的に落とす。
  process.env.NODE_ENV = "production"
  process.env.NEXTJS_ENV = "production"

  mkdirSync(outDir, { recursive: true })
  const attachmentDir = join(outDir, "attachments")
  mkdirSync(attachmentDir, { recursive: true })

  const lib = await loadNotionLib()
  const notion = new Client({ auth: process.env.NOTION_TOKEN })

  console.log("Notion からタスクを取得中...")
  const tasks = (await lib.getTasks({ statuses: MIGRATED_STATUSES })).slice(0, limit)
  console.log(`  ${tasks.length} 件`)

  const known = new Set(tasks.map((t) => t.id))
  const lines = []
  const attachmentUploads = []
  let skippedRelations = 0

  // 1) tasks 本体。FK があるので relations より先に全件入れる。
  lines.push("-- tasks")
  for (const [i, task] of tasks.entries()) {
    process.stdout.write(`\r  本文/コメント取得 ${i + 1}/${tasks.length}`)
    const body = await lib.getTaskBlocks(task.id)
    await sleep(RATE_LIMIT_WAIT_MS)
    const comments = await lib.getTaskComments(task.id)
    await sleep(RATE_LIMIT_WAIT_MS)

    const iconType = task.icon ? (task.icon.type === "emoji" ? "emoji" : "url") : null
    const iconValue = task.icon ? (task.icon.type === "emoji" ? task.icon.emoji : task.icon.url) : null

    lines.push(
      `INSERT INTO tasks (id, notion_url, title, icon_type, icon_value, status, priority, due, location, source, source_url, body, created_time, last_edited_time) VALUES (` +
        [
          sqlTextNotNull(task.id),
          sqlTextNotNull(task.url),
          sqlTextNotNull(task.title),
          sqlText(iconType),
          // icon が Notion S3 由来 (/api/icon/...) の場合、移行後は解決できないので落とす。
          sqlText(iconValue && iconValue.startsWith("/api/icon/") ? null : iconValue),
          sqlText(task.status),
          sqlText(task.priority),
          sqlText(task.due),
          sqlText(task.location),
          sqlText(task.source),
          sqlText(task.sourceUrl),
          sqlTextNotNull(body),
          sqlTextNotNull(task.createdTime),
          sqlTextNotNull(task.lastEditedTime),
        ].join(", ") +
        ");",
    )

    for (const tag of task.tags) {
      lines.push(
        `INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (${sqlTextNotNull(task.id)}, ${sqlTextNotNull(tag)});`,
      )
    }
    for (const assignee of task.assignees) {
      lines.push(
        `INSERT OR IGNORE INTO task_assignees (task_id, assignee) VALUES (${sqlTextNotNull(task.id)}, ${sqlTextNotNull(assignee)});`,
      )
    }
    for (const c of comments) {
      lines.push(
        `INSERT OR IGNORE INTO task_comments (id, task_id, text, author, created_time) VALUES (` +
          [sqlTextNotNull(c.id), sqlTextNotNull(task.id), sqlTextNotNull(c.text), sqlTextNotNull(c.author), sqlTextNotNull(c.createdTime)].join(", ") +
          ");",
      )
    }

    if (task.attachments.length > 0) {
      const files = await fetchRawFiles(notion, task.id)
      await sleep(RATE_LIMIT_WAIT_MS)
      for (const [index, f] of files.entries()) {
        const key = `tasks/${task.id}/${f.name}`
        const localPath = join(attachmentDir, task.id, f.name)
        attachmentUploads.push({ url: f.url, key, localPath })
        lines.push(
          `INSERT OR IGNORE INTO task_attachments (id, task_id, sort_order, name, r2_key, content_type, size, created_time) VALUES (` +
            [
              sqlTextNotNull(`${task.id}-${index}`),
              sqlTextNotNull(task.id),
              index,
              sqlTextNotNull(f.name),
              sqlTextNotNull(key),
              sqlTextNotNull(guessContentType(f.name)),
              0,
              sqlTextNotNull(task.lastEditedTime),
            ].join(", ") +
            ");",
        )
      }
    }
  }
  process.stdout.write("\n")

  // 2) リレーション。親/子・前/次は対になっているので、親方向と次方向の
  //    有向辺だけを書き出す (逆方向は D1 実装が導出する)。
  lines.push("", "-- relations")
  for (const task of tasks) {
    for (const parentId of task.parentTaskIds) {
      if (!known.has(parentId)) { skippedRelations++; continue }
      lines.push(
        `INSERT OR IGNORE INTO task_relations (from_id, to_id, type) VALUES (${sqlTextNotNull(task.id)}, ${sqlTextNotNull(parentId)}, 'parent');`,
      )
    }
    for (const nextId of task.nextTaskIds) {
      if (!known.has(nextId)) { skippedRelations++; continue }
      lines.push(
        `INSERT OR IGNORE INTO task_relations (from_id, to_id, type) VALUES (${sqlTextNotNull(task.id)}, ${sqlTextNotNull(nextId)}, 'next');`,
      )
    }
  }

  // 3) 選択肢 (Notion では data source のプロパティ定義から取っていたもの)
  lines.push("", "-- option sets")
  const [tagOptions, locationOptions] = [await lib.getTagOptions(), await lib.getLocationOptions()]
  tagOptions.forEach((v, i) => {
    lines.push(`INSERT OR IGNORE INTO option_sets (kind, value, sort_order) VALUES ('tag', ${sqlTextNotNull(v)}, ${i});`)
  })
  locationOptions.forEach((v, i) => {
    lines.push(`INSERT OR IGNORE INTO option_sets (kind, value, sort_order) VALUES ('location', ${sqlTextNotNull(v)}, ${i});`)
  })

  const seedPath = join(outDir, "0002_seed.sql")
  writeFileSync(seedPath, lines.join("\n") + "\n")
  console.log(`SQL を書き出しました: ${seedPath} (${lines.length} statements)`)
  if (skippedRelations > 0) {
    console.log(`  参照先が取得対象外だったリレーションを ${skippedRelations} 件スキップしました`)
  }

  // 4) 添付ファイルのダウンロードと R2 アップロード用スクリプト生成
  if (attachmentUploads.length > 0) {
    console.log(`添付ファイルを ${attachmentUploads.length} 件ダウンロード中...`)
    const shLines = ["#!/bin/sh", "set -eu", "# 生成物: R2 バケット notion-tasks-attachments へアップロードする", ""]
    for (const a of attachmentUploads) {
      mkdirSync(join(a.localPath, ".."), { recursive: true })
      const res = await fetch(a.url)
      if (!res.ok) {
        console.warn(`  取得失敗 (${res.status}): ${a.key}`)
        continue
      }
      await writeFile(a.localPath, Buffer.from(await res.arrayBuffer()))
      shLines.push(
        `npx wrangler r2 object put "notion-tasks-attachments/${a.key}" --file "${a.localPath}" --remote`,
      )
    }
    const shPath = join(outDir, "upload-attachments.sh")
    writeFileSync(shPath, shLines.join("\n") + "\n")
    console.log(`アップロードスクリプト: ${shPath}`)
  }

  const bundlePath = join(outDir, ".notion-lib.mjs")
  if (existsSync(bundlePath)) rmSync(bundlePath)
}

/** 添付の実 URL は Task 型に載らない (proxy URL に置換済み) ので生ページから取る */
async function fetchRawFiles(notion, pageId) {
  const page = await notion.pages.retrieve({ page_id: pageId })
  const prop = page.properties?.[NOTION_FILES_PROP]
  if (!prop || prop.type !== "files") return []
  return prop.files
    .map((f) => ({ name: f.name, url: f.type === "external" ? f.external.url : f.file?.url }))
    .filter((f) => Boolean(f.url))
}

function guessContentType(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  const map = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", avif: "image/avif",
    pdf: "application/pdf", txt: "text/plain", md: "text/markdown",
    csv: "text/csv", json: "application/json", zip: "application/zip",
  }
  return map[ext] ?? "application/octet-stream"
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
