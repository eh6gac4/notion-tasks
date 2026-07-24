"use client"

export function CyberLoader({
  size = "md",
  label = "読み込み中",
}: {
  size?: "md" | "sm"
  label?: string
}) {
  const dotSize = size === "sm" ? 4 : 6
  const count = 5
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="cyber-loader"
      className="loading-dots"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="loading-dot"
          style={{ width: dotSize, height: dotSize }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
