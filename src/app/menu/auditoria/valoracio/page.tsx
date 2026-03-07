'use client'

import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import { Card } from '@/components/ui/card'

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

export default function AuditoriaValoracioPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
        <ModuleHeader subtitle="Valoracio" />

        <Card className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Valoracio d'auditories</h2>
          <p className="text-sm text-gray-600">
            Revisio d'auditories completades, validacio/rebuig i seguiment mensual per incentius.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Pendents de revisar" value="0" />
            <MetricCard label="Validades aquest mes" value="0" />
            <MetricCard label="Mitjana de compliment" value="0%" />
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            Propera iteracio: cua de revisio amb estats `completed`, `under_review`, `validated`, `rejected`.
          </div>
        </Card>
      </div>
    </RoleGuard>
  )
}
