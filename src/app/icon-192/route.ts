import { ImageResponse } from "next/og"
import { cyberIconJsx } from "@/lib/cyber-icon-jsx"

export const dynamic = "force-static"

export function GET() {
  return new ImageResponse(cyberIconJsx(192), { width: 192, height: 192 })
}
