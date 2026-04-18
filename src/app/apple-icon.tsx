import { ImageResponse } from "next/og"
import { cyberIconJsx } from "@/lib/cyber-icon-jsx"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(cyberIconJsx(180), { width: 180, height: 180 })
}
