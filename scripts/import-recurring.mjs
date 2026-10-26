#!/usr/bin/env node
// 繰り返しルールの一括投入スクリプト。
//
//   node scripts/import-recurring.mjs <rules.tsv> [--out .migration]
//
// 出力: .migration/0003_recurring_seed.sql
// 適用:
//   npx wrangler d1 execute notion-tasks --local  --file=./.migration/0003_recurring_seed.sql
//   npx wrangler d1 execute notion-tasks --remote --file=./.migration/0003_recurring_seed.sql
//
// 書き込みは一切行わない (SQL ファイルを吐くだけ)。

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const COLUMNS = [
  "title",
  "freq",
  "interval",
  "byweekday",
  "bymonthday",
  "bymonth",
  "due_time",
  "lead_days",
  "start_date",
  "end_date",
  "status",
  "priority",
  "location",
  "tags",
  "body",
]

const args = process.argv.slice(2)

function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const outDir = resolve(argValue("--out") ?? ".migration")
// フラグとその値を取り除いた残りが入力ファイル
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out")
const inputPath = positional[0]

/** SQL の文字列リテラル。空を NULL にするかは呼び出し側で選ぶ */
function sqlText(value, { nullable = true } = {}) {
  if (nullable && (value === null || value === undefined || value === "")) return "NULL"
  return `'${String(value ?? "").replace(/'/g, "''")}'`
}

const sqlTextNotNull = (value) => sqlText(value, { nullable: false })

/**
 * TS を 1 ファイルに束ねてから動的 import する。本番コードをそのまま使うことで、
 * 「スクリプトは通るが画面では不正」なルールが入り込むのを防ぐ。
 */
async function loadTs(entry, { external = [] } = {}) {
  const bundlePath = join(outDir, `.${entry.replace(/\W+/g, "-")}.mjs`)
  await build({
    entryPoints: [resolve(`src/${entry}.ts`)],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
    external,
    alias: { "@": resolve("src") },
    logLevel: "warning",
  })
  const mod = await import(pathToFileURL(bundlePath).href)
  rmSync(bundlePath, { force: true })
  return mod
}

/** TSV を { 列名: 値 } の配列にする。空行と # 始まりの行は無視 */
function parseTsv(text, path) {
  const rows = text
    .split("\n")
    .map((line, i) => ({ line: line.replace(/\r$/, ""), no: i + 1 }))
    .filter(({ line }) => line.trim() !== "" && !line.startsWith("#"))

  if (rows.length === 0) throw new Error(`${path}: 行がありません`)

  const header = rows[0].line.split("\t").map((h) => h.trim())
  const unknown = header.filter((h) => !COLUMNS.includes(h))
  if (unknown.length > 0) throw new Error(`${path}:1 未知の列: ${unknown.join(", ")}`)
  if (!header.includes("title") || !header.includes("freq") || !header.includes("start_date")) {
    throw new Error(`${path}:1 title / freq / start_date は必須の列です`)
  }

  return rows.slice(1).map(({ line, no }) => {
    const cells = line.split("\t")
    const record = { __line: no }
    header.forEach((key, i) => {
      record[key] = (cells[i] ?? "").trim()
    })
    return record
  })
}

function num(value, fallback = null) {
  if (value === "" || value === undefined) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : Number.NaN
}

/** TSV の 1 行を、DB に入れる形へ正規化する */
function toRecord(row) {
  const freq = row.freq ?? ""
  const byweekday =
    row.byweekday
      ? row.byweekday.split(/[,\s]+/).filter(Boolean).map(Number)
      : null

  return {
    line: row.__line,
    id: randomUUID(),
    title: row.title ?? "",
    status: row.status || null,
    priority: row.priority || null,
    location: row.location || null,
    body: row.body ? row.body.replace(/\\n/g, "\n") : "",
    tags: row.tags ? row.tags.split(/[,\s]+/).filter(Boolean) : [],
    dueTime: row.due_time || null,
    leadDays: num(row.lead_days, 0),
    rule: {
      freq,
      interval: num(row.interval, 1),
      byweekday: byweekday && byweekday.length > 0 ? byweekday : null,
      bymonthday: num(row.bymonthday, null),
      bymonth: num(row.bymonth, null),
      startDate: row.start_date ?? "",
      endDate: row.end_date || null,
    },
  }
}

function validateRecord(record, lib, priorities, path) {
  const errors = []
  if (!record.title) errors.push("title が空です")
  if (record.priority && !priorities.includes(record.priority)) {
    errors.push(`priority は ${priorities.join(" / ")} のいずれかです: ${record.priority}`)
  }
  if (record.dueTime && !lib.isTimeKey(record.dueTime)) {
    errors.push(`due_time は HH:mm 形式にしてください: ${record.dueTime}`)
  }
  if (!Number.isInteger(record.leadDays) || record.leadDays < 0) {
    errors.push(`lead_days は 0 以上の整数にしてください: ${record.leadDays}`)
  }
  errors.push(...lib.validateRule(record.rule))
  return errors.map((e) => `${path}:${record.line} ${e}`)
}

function toSql(records) {
  const now = new Date().toISOString()
  const lines = [
    "-- scripts/import-recurring.mjs が生成。繰り返しルールの一括投入。",
    "-- 適用前に migrations/0002_recurring_tasks.sql を流しておくこと。",
    "",
  ]

  for (const r of records) {
    lines.push(
      "INSERT INTO recurring_tasks (id, title, status, priority, location, body, freq, interval, byweekday, bymonthday, bymonth, due_time, lead_days, start_date, end_date, enabled, created_time, last_edited_time) VALUES (" +
        [
          sqlTextNotNull(r.id),
          sqlTextNotNull(r.title),
          sqlText(r.status),
          sqlText(r.priority),
          sqlText(r.location),
          sqlTextNotNull(r.body),
          sqlTextNotNull(r.rule.freq),
          r.rule.interval,
          sqlText(r.rule.byweekday ? r.rule.byweekday.join(",") : null),
          r.rule.bymonthday ?? "NULL",
          r.rule.bymonth ?? "NULL",
          sqlText(r.dueTime),
          r.leadDays,
          sqlTextNotNull(r.rule.startDate),
          sqlText(r.rule.endDate),
          1,
          sqlTextNotNull(now),
          sqlTextNotNull(now),
        ].join(", ") +
        ");",
    )
    for (const tag of r.tags) {
      lines.push(
        `INSERT OR IGNORE INTO recurring_task_tags (recurring_id, tag) VALUES (${sqlTextNotNull(r.id)}, ${sqlTextNotNull(tag)});`,
      )
    }
  }

  return lines.join("\n") + "\n"
}

/** 同じタイトルが現れた間隔から周期を推定し、TSV の下書きを書き出す */
async function main() {
  mkdirSync(outDir, { recursive: true })

  if (!inputPath) {
    console.error("使い方: node scripts/import-recurring.mjs <rules.tsv> [--out .migration]")
    process.exit(1)
  }

  const lib = await loadTs("lib/recurrence")
  const { PRIORITY_ORDER } = await loadTs("constants/task")
  const rows = parseTsv(readFileSync(inputPath, "utf-8"), inputPath)
  const records = rows.map(toRecord)

  const errors = records.flatMap((r) => validateRecord(r, lib, PRIORITY_ORDER, inputPath))
  if (errors.length > 0) {
    console.error("次の問題を直してから再実行してください:\n")
    for (const e of errors) console.error(`  ${e}`)
    process.exit(1)
  }

  // 投入前に、各ルールが実際にいつ発生するかを目で確かめられるようにする。
  const today = new Date().toISOString().slice(0, 10)
  console.log(`${records.length} 件のルールを読み込みました。\n`)
  for (const r of records) {
    const next = lib.nextOccurrences(r.rule, today, 3)
    console.log(`  ${r.title}`)
    console.log(`    ${lib.describeRule(r.rule)}${r.dueTime ? ` ${r.dueTime}` : ""}${r.leadDays > 0 ? ` / ${r.leadDays} 日前に作成` : ""}`)
    console.log(`    次回: ${next.length > 0 ? next.join(" / ") : "（この先の予定なし）"}`)
  }

  const seedPath = join(outDir, "0003_recurring_seed.sql")
  writeFileSync(seedPath, toSql(records))
  console.log(`\n生成しました: ${seedPath}`)
  console.log("適用: npx wrangler d1 execute notion-tasks --remote --file=./" + seedPath.replace(resolve(".") + "/", ""))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
