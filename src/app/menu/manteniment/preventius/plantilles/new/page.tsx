'use client'

import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'

export default function PlantillaNewPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Nova plantilla (pendent d'implementar)" />
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          Aquest formulari s'implementara quan definim l'alta manual o import de plantilles.
        </div>
      </div>
    </RoleGuard>
  )
}
