'use client'

import { Camera } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import { Card } from '@/components/ui/card'

export default function AuditoriaConsultaPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
        <ModuleHeader subtitle="Consulta" />

        <Card className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Consulta d'auditories</h2>
          <p className="text-sm text-gray-600">
            Consulta per esdeveniment, departament, dates i responsable, amb acces a respostes i evidencies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 bg-slate-50">
              <div className="text-sm font-medium text-slate-800">Filtres principals</div>
              <ul className="mt-2 text-sm text-slate-700 list-disc list-inside space-y-1">
                <li>Esdeveniment</li>
                <li>Departament</li>
                <li>Rang de dates</li>
                <li>Estat d'auditoria</li>
              </ul>
            </div>
            <div className="rounded-xl border p-3 bg-slate-50">
              <div className="text-sm font-medium text-slate-800">Detall</div>
              <div className="mt-2 text-sm text-slate-700 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Fotos i evidencies des de Storage
              </div>
            </div>
          </div>
        </Card>
      </div>
    </RoleGuard>
  )
}
