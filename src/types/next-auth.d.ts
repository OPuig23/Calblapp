// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user?: {
      id: string
      role?: string
      department?: string
      deptLower?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string
    department?: string
    deptLower?: string
  }
}
