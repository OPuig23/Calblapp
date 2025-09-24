// src/hooks/useAuth.tsx
'use client'

import { useSession, signIn, signOut } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()
  const loading = status === "loading"
  const user = session?.user ?? null

  return {
    user,
    loading,
    login: () => signIn("credentials", { callbackUrl: "/menu" }),
    logout: () => signOut({ callbackUrl: "/login" })
  }
}
