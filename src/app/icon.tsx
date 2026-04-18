import { ImageResponse } from "next/og"
import { cyberIconJsx } from "@/lib/cyber-icon-jsx"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(cyberIconJsx(32), { width: 32, height: 32 })
}
