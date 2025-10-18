// file: src/app/menu/calendar/page.tsx
'use client'

import React from 'react'
import { RefreshCw, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/useCalendarData'
import CalendarList from '@/components/calendar/CalendarList'
import CalendarMonthView from '@/components/calendar/CalendarMonthView'
import CalendarWeekView from '@/components/calendar/CalendarWeekView'
import CalendarNewEventModal from '@/components/calendar/CalendarNewEventModal'
import Legend from '@/components/calendar/CalendarLegend'
import CalendarFilters, { CalendarFilterChange } from '@/components/calendar/CalendarFilters'
import { useSession } from 'next-auth/react'

type Mode = 'month' | 'week'

export default function CalendarPage() {
  const { deals, loading, error, reload } = useCalendarData()
  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()

  // Estat de filtres únic (font de veritat)
  const [filters, setFilters] = React.useState<CalendarFilterChange>({
    mode: 'month',
    start: undefined,
    end: undefined,
  })
  const [syncing, setSyncing] = React.useState(false)

  // 🔄 Sincronització manual amb Zoho
  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sync/zoho-to-firestore?mode=manual', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error de sincronització')
      alert(`✅ Sincronització completada:\n${json.updated || 0} actualitzats, ${json.created || 0} nous.`)
      reload()
    } catch (err) {
      alert('❌ Error sincronitzant amb Zoho.')
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

// 🧠 Filtrar per solapament amb el rang [start, end]
const visibleDeals = React.useMemo(() => {
  if (!filters.start || !filters.end) return deals
  const start = filters.start
  const end = filters.end

  // Comprovem si [eventStart, eventEnd] solapa amb [start, end]
  const overlaps = (eventStart?: string, eventEnd?: string) => {
    const s = (eventStart || '').slice(0, 10)
    const e = (eventEnd || eventStart || '').slice(0, 10)
    if (!s || !e) return false
    return !(e < start || s > end)
  }

  // ✅ passem només DataInici i DataFi
  return deals.filter(d => overlaps(d.DataInici || d.Data, d.DataFi))
}, [deals, filters.start, filters.end])


  if (error) {
    return <div className="p-6 text-red-600 text-center">❌ Error carregant dades del calendari: {error}</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* 🔹 CAPÇALERA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-blue-600" size={22} />
          <h1 className="text-xl font-semibold">Calendari Comercial</h1>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <CalendarNewEventModal onCreated={reload} />
          {role === 'admin' && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin text-blue-500' : ''} />
              {syncing ? 'Sincronitzant...' : 'Sincronitzar amb Zoho'}
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 CÀPSULA ÚNICA DE FILTRES (vista + navegació) */}
      <CalendarFilters
        defaultMode="month"
        onChange={(f) => setFilters(f)}
        onReset={() => setFilters({ mode: 'month', start: undefined, end: undefined })}
      />

      {/* 🔹 LLEGENDA */}
      <Legend />

      {/* 🔹 CONTINGUT PRINCIPAL */}
      {filters.mode === 'month' ? (
        <CalendarMonthView
          deals={visibleDeals}
          start={filters.start}
          end={filters.end}
          onCreated={reload}
        />
      ) : filters.mode === 'week' ? (
        <CalendarWeekView
          deals={visibleDeals}
          start={filters.start}
          end={filters.end}
          onCreated={reload}
        />
      ) : (
        <CalendarList deals={visibleDeals} loading={loading} />
      )}
    </div>
  )
}
