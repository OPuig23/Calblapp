import NextAuth, { DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

// Extensió del tipus Session
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string
    user?: {
      id: string
      role?: string
      department?: string
      deptLower?: string
      pushEnabled?: boolean   // 👈 AQUEST
    } & DefaultSession["user"]
  }
}

// Extensió del tipus JWT
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string
    role?: string
    department?: string
    deptLower?: string
    pushEnabled?: boolean     // 👈 AQUEST
  }
}

export {}   // 👈 OBLIGATORI
