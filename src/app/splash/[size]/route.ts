import { ImageResponse } from "next/og"
import { splashJsx } from "@/lib/splash-jsx"
import { SPLASH_SIZES } from "@/constants/splash"

export const dynamic = "force-static"

export function generateStaticParams() {
  return SPLASH_SIZES.map(({ w, h }) => ({ size: `${w}x${h}` }))
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const match = SPLASH_SIZES.find((s) => `${s.w}x${s.h}` === size)
  if (!match) return new Response("Not found", { status: 404 })

  return new ImageResponse(splashJsx(match.w, match.h), { width: match.w, height: match.h })
}
