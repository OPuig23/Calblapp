'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { type Role, normalizeRole } from '@/lib/roles'

export function withRoleGuard<P>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function GuardedComponent(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      if (status !== 'loading') {
        const role = normalizeRole((session?.user as any)?.role)
        if (!allowedRoles.includes(role)) {
          router.replace('/menu') // o /login
        }
      }
    }, [status, session, router])

    if (status === 'loading') return <p>Carregant…</p>
    return <Component {...props} />
  }
}
