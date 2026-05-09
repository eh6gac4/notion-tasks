#!/usr/bin/env node
// PR1つ (= main への push 1回) ごとに patch を +1。
// 桁が 10 に達したら上位へ繰り上げ:
//   0.0.0 → ... → 0.0.9 → 0.1.0 → ... → 0.9.9 → 1.0.0
//
// package.json と package-lock.json (top-level + packages[""]) を更新する。

import { readFileSync, writeFileSync } from "node:fs"
import { bumpVersion } from "./bump-version-core.mjs"

const PKG = "package.json"
const LOCK = "package-lock.json"

function rewriteJson(path, mutate) {
  const raw = readFileSync(path, "utf-8")
  const data = JSON.parse(raw)
  mutate(data)
  const trailing = raw.endsWith("\n") ? "\n" : ""
  writeFileSync(path, JSON.stringify(data, null, 2) + trailing)
}

const pkg = JSON.parse(readFileSync(PKG, "utf-8"))
const next = bumpVersion(pkg.version)

rewriteJson(PKG, (d) => { d.version = next })
rewriteJson(LOCK, (d) => {
  d.version = next
  if (d.packages && d.packages[""]) d.packages[""].version = next
})

console.log(next)
