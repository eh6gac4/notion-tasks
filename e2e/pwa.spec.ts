import { test, expect } from "@playwright/test"

test.describe("PWA マニフェスト", () => {
  test("/manifest.webmanifest が正しく返される", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest")
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toBe("#ff00cc")
    expect(manifest.background_color).toBe("#0d0014")
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)

    const pngIcons = manifest.icons.filter((i: { type: string }) => i.type === "image/png")
    expect(pngIcons.length).toBeGreaterThanOrEqual(2)
  })

  test("/icon-192 が PNG を返す", async ({ request }) => {
    const response = await request.get("/icon-192")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })

  test("/icon-512 が PNG を返す", async ({ request }) => {
    const response = await request.get("/icon-512")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })
})
