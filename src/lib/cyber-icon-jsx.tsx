export function cyberIconJsx(size: number) {
  const isSmall = size <= 48

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(155deg, #ff2d55 0%, #d4123f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 176 176" style={{ display: "flex" }}>
        {!isSmall && [
          <defs key="defs">
            <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="1.6" fill="#2a0410" fillOpacity="0.4" />
            </pattern>
            <radialGradient id="vignetteFill" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#ff2d55" stopOpacity="1" />
              <stop offset="34%" stopColor="#ff2d55" stopOpacity="1" />
              <stop offset="78%" stopColor="#ff2d55" stopOpacity="0" />
            </radialGradient>
          </defs>,
          <rect key="dots" width="176" height="176" fill="url(#dots)" />,
          <rect key="vignette" width="176" height="176" fill="url(#vignetteFill)" />,
        ]}
        <g stroke="#2a0410" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 50 128 L 50 48 L 96 104 L 96 48" />
          <path d="M 96 104 L 118 128 L 140 66" />
        </g>
      </svg>
    </div>
  )
}
