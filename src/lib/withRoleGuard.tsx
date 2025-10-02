// file: src/lib/withRoleGuard.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { type Role, normalizeRole } from '@/lib/roles'

// Ampliem el tipus de Session user per incloure role
interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  role?: string
}

export function withRoleGuard<P>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function GuardedComponent(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (status !== 'loading') {
        const user = session?.user as SessionUser | undefined
        const role = normalizeRole(user?.role || '')
        if (!allowedRoles.includes(role)) {
          router.replace('/menu') // o /login
        }
      }
    }, [status, session, router, allowedRoles])

    if (status === 'loading') return <p>Carregant…</p>
    return <Component {...props} />
  }
}
