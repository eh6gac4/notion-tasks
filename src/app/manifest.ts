import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "To-do",
    short_name: "To-do",
    description: "タスクとメールの管理",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ja",
    dir: "ltr",
    categories: ["productivity"],
    // ホーム画面のアイコン長押しからメール画面へ直接遷移する(トップ経由の往復を省く)。
    shortcuts: [
      {
        name: "メール",
        short_name: "メール",
        url: "/mail",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
    ],
    background_color: "#0b0008",
    theme_color: "#dc143c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
