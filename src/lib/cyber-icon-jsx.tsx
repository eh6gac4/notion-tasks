export function cyberIconJsx(size: number) {
  const isSmall = size <= 48
  const dotSpacing = isSmall ? 4 : 12
  const dotRadius = isSmall ? 0.5 : 1
  const borderWidth = isSmall ? 2 : Math.max(4, Math.floor(size / 64))
  const checkSize = Math.floor(size * 0.58)
  const strokeWidth = isSmall ? 2 : 2.5

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d0014",
        backgroundImage: `radial-gradient(circle, rgba(255,0,204,0.25) ${dotRadius}px, transparent ${dotRadius}px)`,
        backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `${borderWidth}px solid rgba(255,0,204,0.8)`,
        boxSizing: "border-box",
      }}
    >
      <svg
        width={checkSize}
        height={checkSize}
        viewBox="0 0 20 20"
        style={{ display: "flex" }}
      >
        {!isSmall && (
          <polyline
            points="3,10 8,15 17,5"
            fill="none"
            stroke="#ff00cc"
            strokeWidth={strokeWidth * 3}
            strokeLinecap="square"
            strokeLinejoin="miter"
            opacity={0.2}
          />
        )}
        <polyline
          points="3,10 8,15 17,5"
          fill="none"
          stroke="#ff00cc"
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  )
}
