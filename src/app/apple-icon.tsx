import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d0014",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* border */}
      <div
        style={{
          position: "absolute",
          inset: 8,
          border: "3px solid rgba(255,0,204,0.8)",
          display: "flex",
        }}
      />
      {/* checkmark */}
      <svg
        viewBox="0 0 100 100"
        width={110}
        height={110}
        style={{ display: "flex" }}
      >
        <polyline
          points="15,50 40,75 85,25"
          fill="none"
          stroke="#ff00cc"
          strokeWidth="10"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </div>,
    { width: 180, height: 180 },
  )
}
