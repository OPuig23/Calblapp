// filename: src/app/menu/pissarra/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { startOfWeek, endOfWeek } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { normalizeRole } from '@/lib/roles'
import { RoleGuard } from '@/lib/withRoleGuard'
import usePissarra from '@/hooks/usePissarra'
import PissarraList from './components/PissarraList'
import SmartFilters from '@/components/filters/SmartFilters'
import { Button } from '@/components/ui/button'
import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'

export default function PissarraPage() {
  const { data: session, status } = useSession()

  const role = normalizeRole(session?.user?.role || 'treballador')
  const dept = (session?.user?.department || '').toLowerCase()
  const [mode, setMode] = useState<'produccio' | 'logistica'>('produccio')
  const [lnFilter, setLnFilter] = useState<string>('__all__')
  const [commercialFilter, setCommercialFilter] = useState<string>('__all__')

  const now = new Date()
  const defaultWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const defaultWeekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const [week, setWeek] = useState({
    startISO: defaultWeekStart.toISOString().slice(0, 10),
    endISO: defaultWeekEnd.toISOString().slice(0, 10),
  })

  const { dataByDay, flat, loading, error, canEdit, updateField } = usePissarra(
    week.startISO,
    week.endISO,
    role,
    dept,
    mode
  )

  const { setContent, setOpen } = useFilters()

  const lnOptions = useMemo(
    () => Array.from(new Set(flat.map((e) => e.LN).filter(Boolean))).sort(),
    [flat]
  )
  const commercialOptions = useMemo(
    () => Array.from(new Set(flat.map((e) => e.comercial).filter(Boolean))).sort(),
    [flat]
  )

  const filteredDataByDay = useMemo(() => {
    const grouped: Record<string, typeof flat> = {}

    const filtered = flat.filter((ev) => {
      if (lnFilter !== '__all__' && ev.LN !== lnFilter) return false
      if (commercialFilter !== '__all__' && ev.comercial !== commercialFilter) return false
      return true
    })

    filtered.forEach((ev) => {
      const day = ev.startDate || 'sense-data'
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(ev)
    })

    return grouped
  }, [flat, lnFilter, commercialFilter])

  const openFiltersPanel = () => {
    setContent(
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-700">Línia de negoci</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={lnFilter}
            onChange={(e) => setLnFilter(e.target.value)}
          >
            <option value="__all__">Totes</option>
            {lnOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-700">Comercial</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={commercialFilter}
            onChange={(e) => setCommercialFilter(e.target.value)}
          >
            <option value="__all__">Tots</option>
            {commercialOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setLnFilter('__all__')
            setCommercialFilter('__all__')
            setOpen(false)
          }}
        >
          Neteja filtres
        </Button>
      </div>
    )
    setOpen(true)
  }

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
            <FilterButton onClick={openFiltersPanel} />
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
            dataByDay={filteredDataByDay}
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
