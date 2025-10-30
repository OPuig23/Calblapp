// file: src/lib/withRoleGuard.tsx
'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { normalizeRole } from '@/lib/roles'

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  role?: string
  department?: string | null
}

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

/**
 * 🔒 Component de protecció d’accés per rols i departaments
 * - Mostra “Carregant…” mentre la sessió s’està carregant.
 * - Redirigeix a /menu si l’usuari no té accés.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === 'loading') return

    const user = session?.user as SessionUser | undefined
    const role = normalizeRole(user?.role || '')
    const dept = (user?.department || '').toLowerCase()

    // Sense sessió o rol no permès
    if (!session || !allowedRoles.includes(role)) {
      router.replace('/menu')
      return
    }

    // Cap d’un altre departament
    if (role === 'cap' && dept !== 'logistica') {
      router.replace('/menu')
      return
    }
  }, [status, session, router, allowedRoles])

  if (status === 'loading') return <p>Carregant…</p>

  return <>{children}</>
}
