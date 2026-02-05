'use client'

import Link from 'next/link'
import { Wrench, ClipboardList, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { RoleGuard } from '@/lib/withRoleGuard'
import { normalizeRole } from '@/lib/roles'
import { useMaintenanceNewCount } from '@/hooks/useMaintenanceNewCount'
import { useMaintenanceAssignedCount } from '@/hooks/useMaintenanceAssignedCount'

export default function MantenimentIndexPage() {
  const { data: session } = useSession()
  const userRole = normalizeRole((session?.user as any)?.role || '')
  const userDepartment = ((session?.user as any)?.department || '').toString().toLowerCase()
  const isMaintenanceWorker = userRole === 'treballador' && userDepartment === 'manteniment'
  const isMaintenanceCap = userRole === 'cap' && userDepartment === 'manteniment'
  const isAdmin = userRole === 'admin' || userRole === 'direccio'
  const isProductionWorker = userRole === 'treballador' && userDepartment === 'produccio'
  const isCommercial = userRole === 'comercial'
  const { count: newTicketsCount } = useMaintenanceNewCount()
  const { count: assignedTicketsCount } = useMaintenanceAssignedCount()

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Manteniment</h1>
        <p className="text-sm text-gray-500">Escull la vista que necessites.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(isAdmin || isMaintenanceCap || !isMaintenanceWorker) && (
            <Link
              href="/menu/manteniment/tickets"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-sky-50 to-blue-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-blue-600">
                  <div className="relative">
                    <ClipboardList className="w-5 h-5" />
                    {newTicketsCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                        {newTicketsCount}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Tickets</div>
                  <div className="text-xs text-gray-500">Gestió i assignació</div>
                </div>
              </div>
            </Link>
          )}

          {(isMaintenanceWorker || isMaintenanceCap || isAdmin) && (
            <Link
              href="/menu/manteniment/treball"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-emerald-50 to-green-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-emerald-600">
                  <div className="relative">
                    <Wrench className="w-5 h-5" />
                    {assignedTicketsCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                        {assignedTicketsCount}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Fulls de treball</div>
                  <div className="text-xs text-gray-500">La teva fitxa diària</div>
                </div>
              </div>
            </Link>
          )}

          {(isAdmin || isMaintenanceCap || isCommercial || isProductionWorker) && (
            <Link
              href="/menu/manteniment/seguiment"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-indigo-50 to-purple-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-indigo-600">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Seguiment</div>
                  <div className="text-xs text-gray-500">Consulta d’estat</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
