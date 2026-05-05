// iOS PWA apple-touch-startup-image 対応サイズ
// device-width / height は CSS ピクセル、w / h は実 PNG ピクセル（DPR 込み）
export type SplashSize = {
  w: number
  h: number
  cssW: number
  cssH: number
  dpr: number
}

export const SPLASH_SIZES: readonly SplashSize[] = [
  { w: 1320, h: 2868, cssW: 440, cssH: 956, dpr: 3 }, // iPhone 16 Pro Max
  { w: 1206, h: 2622, cssW: 402, cssH: 874, dpr: 3 }, // iPhone 16 Pro
  { w: 1290, h: 2796, cssW: 430, cssH: 932, dpr: 3 }, // iPhone 15/14 Pro Max
  { w: 1284, h: 2778, cssW: 428, cssH: 926, dpr: 3 }, // iPhone 14 Plus / 13/12 Pro Max
  { w: 1179, h: 2556, cssW: 393, cssH: 852, dpr: 3 }, // iPhone 15/15 Pro / 14/14 Pro
  { w: 1170, h: 2532, cssW: 390, cssH: 844, dpr: 3 }, // iPhone 13/13 Pro / 12/12 Pro
  { w: 1242, h: 2688, cssW: 414, cssH: 896, dpr: 3 }, // iPhone 11 Pro Max / XS Max
  { w: 1125, h: 2436, cssW: 375, cssH: 812, dpr: 3 }, // iPhone 11 Pro / XS / X
  { w: 1080, h: 2340, cssW: 360, cssH: 780, dpr: 3 }, // iPhone 13 mini / 12 mini
  { w: 828, h: 1792, cssW: 414, cssH: 896, dpr: 2 }, // iPhone 11 / XR
  { w: 750, h: 1334, cssW: 375, cssH: 667, dpr: 2 }, // iPhone SE 2/3 / 8 / 7 / 6s
] as const

export function splashStartupImages() {
  return SPLASH_SIZES.map(({ w, h, cssW, cssH, dpr }) => ({
    url: `/splash/${w}x${h}`,
    media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
  }))
}
