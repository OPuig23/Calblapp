// src/services/userService.client.ts
'use client'

export type CurrentUser = {
  id?: string
  name?: string
  department?: string
  role?: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' | string
}

export function getCurrentUserFromSession(session: any): CurrentUser {
  const u = (session?.user as any) || {}
  return {
    id: u.id ? String(u.id) : undefined,
    name: u.name ? String(u.name) : undefined,
    department: u.department ? String(u.department).toLowerCase() : undefined,
    role: u.role,
  }
}

/** Només per proves locals */
export function getMockCurrentUser(): Required<CurrentUser> {
  return {
    id: '90KihhI3rk8IQkhSgZEK',
    name: 'Carata',
    department: 'logistica',
    role: 'Treballador',
  }
}
