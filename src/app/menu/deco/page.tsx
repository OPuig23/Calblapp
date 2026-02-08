'use client'

import Link from 'next/link'
import { ClipboardList, Wrench } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RoleGuard } from '@/lib/withRoleGuard'
import { normalizeRole } from '@/lib/roles'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { useMaintenanceNewCount } from '@/hooks/useMaintenanceNewCount'

const normalizeDept = (raw?: string) =>
  (raw || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export default function DecoIndexPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const userRole = normalizeRole((session?.user as any)?.role || '')
  const userDepartment = normalizeDept((session?.user as any)?.department || '')
  const isDecorationsCap =
    userRole === 'cap' &&
    (userDepartment === 'decoracio' ||
      userDepartment === 'decoracions' ||
      userDepartment === 'decoracion')
  const isDecorationsWorker =
    userRole === 'treballador' &&
    (userDepartment === 'decoracio' ||
      userDepartment === 'decoracions' ||
      userDepartment === 'decoracion')
  const isAdmin = userRole === 'admin' || userRole === 'direccio'
  const hasAccess = isAdmin || isDecorationsCap || isDecorationsWorker

  const { count: newDecoTicketsCount } = useMaintenanceNewCount({ ticketType: 'deco' })

  useEffect(() => {
    if (status === 'loading') return
    if (!hasAccess) router.replace('/menu')
  }, [hasAccess, router, status])

  if (!hasAccess && status !== 'loading') return null

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Tickets i fulls de treball" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(isAdmin || isDecorationsCap) && (
            <Link
              href="/menu/manteniment/tickets-deco"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-amber-50 to-yellow-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-amber-700">
                  <div className="relative">
                    <ClipboardList className="w-5 h-5" />
                    {newDecoTicketsCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                        {newDecoTicketsCount}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Tickets</div>
                  <div className="text-xs text-gray-500">Deco</div>
                </div>
              </div>
            </Link>
          )}

          {(isAdmin || isDecorationsCap || isDecorationsWorker) && (
            <Link
              href="/menu/manteniment/treball"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-emerald-50 to-green-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-emerald-600">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Fulls de treball</div>
                  <div className="text-xs text-gray-500">Tickets (Deco)</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
