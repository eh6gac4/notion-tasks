import "next-auth/jwt"

declare module "next-auth/jwt" {
  interface JWT {
    accessTokenExpires?: number
    refreshTokenExpires?: number
  }
}
