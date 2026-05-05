import { ImageResponse } from "next/og"
import { cyberIconJsx } from "@/lib/cyber-icon-jsx"

export const dynamic = "force-static"

export function GET() {
  return new ImageResponse(cyberIconJsx(512), { width: 512, height: 512 })
}
