"use client"

export function CyberLoader({
  size = "md",
  label = "読み込み中",
}: {
  size?: "md" | "sm"
  label?: string
}) {
  const barH = size === "sm" ? 20 : 32
  const delays = [0, 180, 90, 240, 60]
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="cyber-loader"
      className="inline-flex items-end gap-1"
      style={{ height: barH }}
    >
      {delays.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="equalizer-bar"
          style={{ animationDelay: `${d}ms`, height: barH, width: 4 }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
