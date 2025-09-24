'use client'

import { useSession } from 'next-auth/react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'

type Mode = 'week' | 'day' | 'range'

export default function DraftsFilters({
  onFilter,
}: {
  onFilter: (filters: {
    mode?: Mode
    dateRange?: [string, string]
    department?: string | null
    status?: 'all' | 'confirmed' | 'draft'
  }) => void
}) {
  const { data: session } = useSession()
  const role = (session?.user?.role as string) || 'Treballador'

  return (
    <SmartFilters
      role={role as any}

      /* 🔹 Ara també mostrem el departament */
      showDepartment={true}
      showWorker={false}
      showLocation={false}
      showStatus={true}
      modeDefault="week"
      departmentOptions={['logistica', 'serveis', 'cuina', 'transports']}

      onChange={(f: SmartFiltersChange) => {
        const start = f.start
        const end   = f.end
        onFilter({
          mode: f.mode as Mode,
          dateRange: start && end ? [start, end] : undefined,
          department: f.department || null,   // <-- Afegit
          status: (f.status as any) || 'all',
        })
      }}
    />
  )
}
