import "next-auth/jwt"
import "next-auth"

declare module "next-auth/jwt" {
  interface JWT {
    accessTokenExpires?: number
    refreshTokenExpires?: number
    error?: "RefreshTokenExpired"
  }
}

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenExpired"
  }
}
