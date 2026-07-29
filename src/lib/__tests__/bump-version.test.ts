import { describe, it, expect } from "vitest"

import { bumpVersion } from "../../../scripts/bump-version-core.mjs"

describe("bumpVersion", () => {
  it("patch を +1 する", () => {
    expect(bumpVersion("0.0.0")).toBe("0.0.1")
    expect(bumpVersion("0.1.0")).toBe("0.1.1")
    expect(bumpVersion("1.2.3")).toBe("1.2.4")
  })

  it("patch が 9 の次は minor に繰り上げ", () => {
    expect(bumpVersion("0.0.9")).toBe("0.1.0")
    expect(bumpVersion("1.2.9")).toBe("1.3.0")
  })

  it("minor が 9 で patch も繰り上げなら major に繰り上げ", () => {
    expect(bumpVersion("0.9.9")).toBe("1.0.0")
    expect(bumpVersion("1.9.9")).toBe("2.0.0")
  })

  it("不正なバージョン文字列は例外", () => {
    expect(() => bumpVersion("abc")).toThrow()
    expect(() => bumpVersion("1.2")).toThrow()
    expect(() => bumpVersion("1.x.3")).toThrow()
  })
})
