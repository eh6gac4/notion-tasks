import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { config } from "@/config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
  session: { strategy: "jwt" },
  trustHost: true,
})
