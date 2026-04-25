import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth && !req.auth.error
  const isLoginPage = req.nextUrl.pathname === "/login"

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192|icon-512).*)"],
}
