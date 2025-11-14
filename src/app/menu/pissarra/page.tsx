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

export default function PissarraPage() {
  const { data: session, status } = useSession()

  // 🧩 Sessió i rol usuari
  const role = normalizeRole(session?.user?.role || 'treballador')
  const dept = (session?.user?.department || '').toLowerCase()

  // 📆 Setmana actual per defecte
  const now = new Date()
  const defaultWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const defaultWeekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [week, setWeek] = useState({
    startISO: defaultWeekStart.toISOString().slice(0, 10),
    endISO: defaultWeekEnd.toISOString().slice(0, 10),
  })

  // 🔁 Dades Firestore
  const { dataByDay, loading, error, canEdit, updateField } = usePissarra(
    week.startISO,
    week.endISO,
    role,
    dept
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

        {/* 🔹 Barra filtres */}
        <div className="border-b bg-white sticky top-0 z-10 px-3 py-2">
          <SmartFilters
            modeDefault="week"
            role={
              session?.user?.role === 'admin'
                ? 'Admin'
                : session?.user?.role === 'direccio'
                ? 'Direcció'
                : session?.user?.role === 'cap'
                ? 'Cap Departament'
                : 'Treballador'
            }
            showDepartment={false}
            showWorker={false}
            showLocation={false}
            showStatus={false}
            showImportance={false}
            onChange={(f) => {
              if (f.start && f.end) {
                setWeek({ startISO: f.start, endISO: f.end })
              }
            }}
          />
        </div>

        {/* 🔹 Carregant o error */}
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

        {/* 🔹 Llista (només es mostra quan hi ha dades) */}
        {!loading && !error && (
  <PissarraList
    key={week.startISO}
    dataByDay={dataByDay}
    canEdit={canEdit}
    onUpdate={updateField}
    weekStart={new Date(week.startISO)}
  />
)}

      </main>
    </RoleGuard>
  )
}
