import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { config } from "@/config"
import { PASSKEY_COOKIE, passkeyStore } from "@/lib/passkeys"
import { cookies } from "next/headers"

const ACCESS_TOKEN_TTL = 15 * 60
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "passkey",
      credentials: { response: {} },
      async authorize({ response }) {
        if (typeof response !== "string" || response.length > 20000) return null
        try {
          const challenge = (await cookies()).get(PASSKEY_COOKIE)?.value
          return await passkeyStore().authenticate(challenge, JSON.parse(response))
        } catch {
          return null
        }
      },
    }),
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      authorize({ username, password }) {
        if (
          username === config.auth.username &&
          password === config.auth.password
        ) {
          return { id: "1", name: username as string }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: REFRESH_TOKEN_TTL },
  callbacks: {
    jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000)
      if (user) {
        return {
          ...token,
          accessTokenExpires: now + ACCESS_TOKEN_TTL,
          refreshTokenExpires: now + REFRESH_TOKEN_TTL,
        }
      }
      if (now < (token.accessTokenExpires ?? 0)) return token
      if (now < (token.refreshTokenExpires ?? 0)) {
        return { ...token, accessTokenExpires: now + ACCESS_TOKEN_TTL }
      }
      return null
    },
  },
  trustHost: true,
})
