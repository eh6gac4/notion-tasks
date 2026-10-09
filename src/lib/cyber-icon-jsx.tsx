export function cyberIconJsx(size: number) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <svg width={size} height={size} viewBox="0 0 176 176">
        <defs>
          <linearGradient id="field" x1="0" y1="0" x2="176" y2="176" gradientUnits="userSpaceOnUse">
            <stop stopColor="#190b13" />
            <stop offset="1" stopColor="#0b0008" />
          </linearGradient>
          <linearGradient id="ink" x1="48" y1="121" x2="126" y2="51" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dc143c" />
            <stop offset="0.6" stopColor="#ff2d55" />
            <stop offset="1" stopColor="#ff859a" />
          </linearGradient>
        </defs>
        <rect width="176" height="176" fill="url(#field)" />
        {/* マーク全体を中央の安全領域に収め、ホーム画面の切り抜きに備える。 */}
        <g fill="none" stroke="url(#ink)" strokeLinecap="round" strokeLinejoin="round">
          {/* 右上を開いた封筒。折り目がそのままチェックへつながる。 */}
          <path
            d="M 96 58 H 58 Q 48 58 48 68 V 111 Q 48 121 58 121 H 118 Q 128 121 128 111 V 88"
            strokeWidth="7"
          />
          <path d="M 49 70 L 79 96 L 126 51" strokeWidth="9" />
        </g>
      </svg>
    </div>
  )
}
