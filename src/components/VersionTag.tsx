// 左下に固定表示するビルド情報。デプロイ確認用に
// `v0.1.0 · a1b2c3d · 05/09 16:45 JST` 形式で出す。
// dev 環境では先頭に `[DEV]` を付ける。
//
// 表示は常に JST (Asia/Tokyo) に固定する。Cloudflare Workers (UTC) で SSR
// された結果とブラウザ側 (任意 TZ) のクライアント描画を一致させて
// hydration mismatch を防ぐ目的も兼ねる。
function formatBuildTime(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(jst.getUTCDate()).padStart(2, "0")
  const hh = String(jst.getUTCHours()).padStart(2, "0")
  const mi = String(jst.getUTCMinutes()).padStart(2, "0")
  return `${mm}/${dd} ${hh}:${mi} JST`
}

export function VersionTag() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
  const sha = process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown"
  const time = formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME)
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div
      data-testid="version-tag"
      className="font-pixel"
      style={{
        position: "fixed",
        bottom: "calc(12px + var(--safe-bottom))",
        left: "calc(12px + var(--safe-left))",
        zIndex: 9999,
        background: "rgba(11, 0, 8, 0.85)",
        border: `1px solid ${isDev ? "rgba(245, 158, 11, 0.45)" : "rgba(220, 20, 60, 0.35)"}`,
        color: isDev ? "#f59e0b" : "rgba(255, 255, 255, 0.55)",
        fontSize: "10px",
        letterSpacing: "0.1em",
        padding: "4px 8px",
        borderRadius: "4px",
        pointerEvents: "none",
      }}
    >
      {isDev && <span style={{ fontWeight: "bold", marginRight: "4px" }}>[DEV]</span>}
      <span>v{version}</span>
      <span style={{ opacity: 0.6, margin: "0 6px" }}>·</span>
      <span>{sha}</span>
      {time && (
        <>
          <span style={{ opacity: 0.6, margin: "0 6px" }}>·</span>
          <span>{time}</span>
        </>
      )}
    </div>
  )
}
