import type { Metadata, Viewport } from "next"
import { DotGothic16 } from "next/font/google"
import "./globals.css"

const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dot-gothic",
})

export const metadata: Metadata = {
  title: "To-do",
  description: "Notion タスク管理",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`h-full ${dotGothic.variable}`} suppressHydrationWarning>
      <body className="h-full bg-[#0d0014] antialiased font-[family-name:var(--font-dot-gothic)]">{children}</body>
    </html>
  )
}
