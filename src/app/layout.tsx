import type { Metadata, Viewport } from "next"
import { DotGothic16 } from "next/font/google"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import { SplashScreen } from "@/components/SplashScreen"
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
  themeColor: "#ff00cc",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`h-full ${dotGothic.variable}`} suppressHydrationWarning>
      <body className={`h-full bg-[#0d0014] antialiased ${dotGothic.className}`}>
        {/* キーフレームをインライン定義してCSSファイル読み込み前からアニメーションを有効化 */}
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: "@keyframes _ss{to{transform:rotate(360deg)}}" }} />
        {/* スプラッシュ: インラインスタイルのみで表示、外部CSS不要 */}
        <div
          id="app-splash"
          style={{
            position: "fixed",
            inset: 0,
            background: "#0d0014",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            transition: "opacity 0.3s ease",
          }}
        >
          <div style={{ color: "#ff00cc", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.3em", marginBottom: "20px", textShadow: "0 0 20px #ff00cc" }}>
            ✦ To-do
          </div>
          <div style={{ width: 28, height: 28, border: "2px solid rgba(255,0,204,0.2)", borderTopColor: "#ff00cc", borderRadius: "50%", animation: "_ss 0.8s linear infinite" }} />
        </div>
        <ServiceWorkerRegistration />
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}
