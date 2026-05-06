import { cyberIconJsx } from "./cyber-icon-jsx"

export function splashJsx(width: number, height: number) {
  const iconSize = Math.round(Math.min(width, height) * 0.36)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0008",
      }}
    >
      <div style={{ width: iconSize, height: iconSize, display: "flex" }}>
        {cyberIconJsx(iconSize)}
      </div>
    </div>
  )
}
