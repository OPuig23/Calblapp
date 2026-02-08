'use client'

import Link from 'next/link'
import { Wrench, Eye, CalendarCheck2, FileStack } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { RoleGuard } from '@/lib/withRoleGuard'
import { normalizeRole } from '@/lib/roles'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { useMaintenanceAssignedCount } from '@/hooks/useMaintenanceAssignedCount'

const normalizeDept = (raw?: string) =>
  (raw || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export default function MantenimentIndexPage() {
  const { data: session } = useSession()
  const userRole = normalizeRole((session?.user as any)?.role || '')
  const userDepartment = normalizeDept((session?.user as any)?.department || '')
  const isMaintenanceWorker = userRole === 'treballador' && userDepartment === 'manteniment'
  const isMaintenanceCap = userRole === 'cap' && userDepartment === 'manteniment'
  const isAdmin = userRole === 'admin' || userRole === 'direccio'
  const isProductionWorker = userRole === 'treballador' && userDepartment === 'produccio'
  const isCommercial = userRole === 'comercial'
  const { count: assignedTicketsCount } = useMaintenanceAssignedCount()

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Gestió i assignació" />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(isAdmin || isMaintenanceCap || isMaintenanceWorker) && (
            <Link
              href="/menu/manteniment/preventius/planificador"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-teal-50 to-cyan-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-teal-700">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Planificador</div>
                  <div className="text-xs text-gray-500">Preventius + tickets</div>
                </div>
              </div>
            </Link>
          )}

          {(isAdmin || isMaintenanceCap) && (
            <Link
              href="/menu/manteniment/preventius/plantilles"
              className="border rounded-2xl p-4 hover:shadow-sm bg-gradient-to-br from-slate-50 to-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-slate-700">
                  <FileStack className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">Plantilles</div>
                  <div className="text-xs text-gray-500">Plans i checklists</div>
                </div>
              </div>
            </Link>
          )}

          {(isMaintenanceWorker || isMaintenanceCap || isAdmin) && (
            <Link
              href="/menu/manteniment/preventius/fulls"
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
                  <div className="text-base font-semibold text-gray-900">Jornada</div>
                  <div className="text-xs text-gray-500">Preventius + tickets</div>
                </div>
              </div>
            </Link>
          )}

          {(isAdmin || isMaintenanceCap || isDecorationsCap || isCommercial || isProductionWorker) && (
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

