// 桁が 10 に達したら上位へ繰り上げる base-10 カウンタ:
//   0.0.0 → ... → 0.0.9 → 0.1.0 → ... → 0.9.9 → 1.0.0
// 標準 semver と異なり patch / minor は単桁に丸める。
export function bumpVersion(version) {
  const parts = version.split(".").map((n) => Number(n))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`unexpected version format: ${version}`)
  }
  let [maj, min, pat] = parts
  pat += 1
  if (pat >= 10) { pat = 0; min += 1 }
  if (min >= 10) { min = 0; maj += 1 }
  return `${maj}.${min}.${pat}`
}
