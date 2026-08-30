export function cyberIconJsx(size: number) {
  const isSmall = size <= 48

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(155deg, #16060c 0%, #0b0008 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 176 176" style={{ display: "flex" }}>
        {!isSmall && [
          <defs key="defs">
            <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="1.6" fill="#dc143c" fillOpacity="0.14" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="45%" r="62%">
              <stop offset="0%" stopColor="#dc143c" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#dc143c" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#dc143c" stopOpacity="0" />
            </radialGradient>
          </defs>,
          <rect key="dots" width="176" height="176" fill="url(#dots)" />,
          <rect key="glow" width="176" height="176" fill="url(#glow)" />,
        ]}
        <g stroke="#ff2d55" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* 封筒本体 = メール */}
          <path
            strokeWidth="13"
            d="M 44 58 L 128 58 Q 142 58 142 72 L 142 120 Q 142 134 128 134 L 44 134 Q 30 134 30 120 L 30 72 Q 30 58 44 58 Z"
          />
          {/* 封筒フラップ左辺からそのまま立ち上がるチェック = タスク完了 */}
          <path strokeWidth="16" d="M 36 66 L 73 100 L 134 42" />
        </g>
      </svg>
    </div>
  )
}
