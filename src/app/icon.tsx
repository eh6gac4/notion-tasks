import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d0014",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #ff00cc",
        boxSizing: "border-box",
      }}
    >
      <span style={{ color: "#ff00cc", fontSize: 20, lineHeight: 1, display: "flex" }}>✓</span>
    </div>,
    { width: 32, height: 32 },
  )
}
