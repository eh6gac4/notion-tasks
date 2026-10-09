export function cyberIconJsx(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0b0008",
        display: "flex",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 176 176">
        {/* マーク全体を中央の安全領域に収め、ホーム画面の切り抜きに備える。 */}
        <rect x="40" y="58" width="96" height="66" rx="14" fill="#ff2d55" />
        {/* 封筒の折り目とタスク完了のチェックを一つの形にする。 */}
        <path
          d="M 52 78 L 77 101 L 124 57"
          fill="none"
          stroke="#fff4f6"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
