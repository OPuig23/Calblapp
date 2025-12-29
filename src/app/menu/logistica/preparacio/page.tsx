// file: src/app/menu/logistica/preparacio/page.tsx
'use client'

import { RoleGuard } from '@/lib/withRoleGuard'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { LogisticsGrid } from '@/components/logistics'

export default function LogisticsPage() {
  return (
    <section className="space-y-6">
      <ModuleHeader
        icon="🚚"
        title="Preparació logística"
        subtitle="Planificació de dates i hores de preparació dels esdeveniments"
      />

      <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
        <LogisticsGrid />
      </RoleGuard>
    </section>
  )
}
