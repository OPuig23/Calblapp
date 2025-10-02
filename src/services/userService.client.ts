// filename: src/services/userService.client.ts
'use client'

import type { Session } from 'next-auth'

export type CurrentUser = {
  id?: string
  name?: string
  department?: string
  role?: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' | string
}

/**
 * Extreiem l’usuari actual des de la sessió de NextAuth
 */
export function getCurrentUserFromSession(session: Session | null): CurrentUser {
  const u = session?.user as
    | {
        id?: string
        name?: string
        department?: string
        role?: string
      }
    | undefined

  return {
    id: u?.id ? String(u.id) : undefined,
    name: u?.name ? String(u.name) : undefined,
    department: u?.department ? String(u.department).toLowerCase() : undefined,
    role: u?.role,
  }
}

/** 🔹 Només per proves locals */
export function getMockCurrentUser(): Required<CurrentUser> {
  return {
    id: '90KihhI3rk8IQkhSgZEK',
    name: 'Carata',
    department: 'logistica',
    role: 'Treballador',
  }
}
