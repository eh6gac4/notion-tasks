import type { Metadata, Viewport } from "next"
import { DotGothic16 } from "next/font/google"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import { SplashScreen } from "@/components/SplashScreen"
import { DebugUI } from "@/components/DebugUI"
import { SettingsProvider } from "@/components/SettingsContext"
import { splashStartupImages } from "@/constants/splash"
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
  appleWebApp: {
    capable: true,
    title: "To-do",
    statusBarStyle: "black-translucent",
    startupImage: splashStartupImages(),
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#dc143c",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`h-full ${dotGothic.variable}`} suppressHydrationWarning>
      <body className={`h-full antialiased ${dotGothic.className}`}>
        {/* キーフレームをインライン定義してCSSファイル読み込み前からアニメーションを有効化 */}
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: "@keyframes _ss{to{transform:rotate(360deg)}}" }} />
        {/* スプラッシュ: インラインスタイルのみで表示、外部CSS不要 */}
        <div
          id="app-splash"
          style={{
            position: "fixed",
            inset: 0,
            background: "#0b0008",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            className="font-pixel"
            style={{ color: "#dc143c", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.3em", marginBottom: "20px", textShadow: "0 0 12px rgba(220,20,60,0.6)" }}
          >
            ✦ To-do
          </div>
          <div style={{ width: 24, height: 24, border: "2px solid rgba(220,20,60,0.18)", borderTopColor: "#dc143c", borderRadius: "50%", animation: "_ss 0.8s linear infinite" }} />
        </div>
        <ServiceWorkerRegistration />
        <SplashScreen />
        <SettingsProvider>
          {children}
          <DebugUI />
        </SettingsProvider>
      </body>
    </html>
  )
}
