// filename: src/app/menu/pissarra/page.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { normalizeRole } from '@/lib/roles'
import { RoleGuard } from '@/lib/withRoleGuard'
import usePissarra from '@/hooks/usePissarra'
import PissarraList from './components/PissarraList'
import SmartFilters from '@/components/filters/SmartFilters'
import { Button } from '@/components/ui/button'

export default function PissarraPage() {
  const { data: session, status } = useSession()

  const role = normalizeRole(session?.user?.role || 'treballador')
  const dept = (session?.user?.department || '').toLowerCase()
  const [mode, setMode] = useState<'produccio' | 'logistica'>('produccio')

  const now = new Date()
  const defaultWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const defaultWeekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [week, setWeek] = useState({
    startISO: defaultWeekStart.toISOString().slice(0, 10),
    endISO: defaultWeekEnd.toISOString().slice(0, 10),
  })

  const { dataByDay, loading, error, canEdit, updateField } = usePissarra(
    week.startISO,
    week.endISO,
    role,
    dept,
    mode
  )

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <RoleGuard
      allowedRoles={[
        'admin',
        'direccio',
        'cap',
        'treballador',
        'comercial',
        'usuari',
      ]}
    >
      <main className="flex flex-col h-full w-full overflow-y-auto bg-gray-50">

        {/* Barra filtres i mode */}
        <div className="border-b bg-white sticky top-0 z-10 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <SmartFilters
              modeDefault="week"
              role={
                session?.user?.role === 'admin'
                  ? 'Admin'
                  : session?.user?.role === 'direccio'
                  ? 'Direccio'
                  : session?.user?.role === 'cap'
                  ? 'Cap Departament'
                  : 'Treballador'
              }
              showDepartment={false}
              showWorker={false}
              showLocation={false}
              showStatus={false}
              showImportance={false}
              compact
              onChange={(f) => {
                if (f.start && f.end) {
                  setWeek({ startISO: f.start, endISO: f.end })
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'produccio' ? 'default' : 'outline'}
                onClick={() => setMode('produccio')}
              >
                Pissarra Produccio
              </Button>
              <Button
                size="sm"
                variant={mode === 'logistica' ? 'default' : 'outline'}
                onClick={() => setMode('logistica')}
              >
                Pissarra Logistica
              </Button>
            </div>
          </div>
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-500 text-sm mt-4">
            Error: {error}
          </p>
        )}

        {/* Llista */}
        {!loading && !error && (
          <PissarraList
            key={`${week.startISO}-${mode}`}
            dataByDay={dataByDay}
            canEdit={canEdit}
            onUpdate={updateField}
            weekStart={new Date(week.startISO)}
            variant={mode}
          />
        )}

      </main>
    </RoleGuard>
  )
}
