// file: src/app/menu/calendar/page.tsx
'use client'

import React, { useState } from 'react'
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

export default function CalendarPage() {
  const [filters, setFilters] = useState<CalendarFilterChange>({
    mode: 'month',
    ln: 'Tots',
    stage: 'Tots',
  })
  const { deals, loading, error, reload } = useCalendarData({
    ln: filters.ln,
    stage: filters.stage,
  })
  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sync/zoho-to-firestore?mode=manual', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error de sincronització')
      alert(`✅ Sincronització completada:\n${json.updated || 0} actualitzats, ${json.created || 0} nous.`)
      reload()
    } catch {
      alert('❌ Error sincronitzant amb Zoho.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* 🔹 Capçalera */}
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

      {/* 🔹 Filtres */}
      <CalendarFilters
        defaultMode="month"
        onChange={(f) => setFilters(f)}
        onReset={() =>
          setFilters({ mode: 'month', ln: 'Tots', stage: 'Tots' })
        }
      />

      {/* 🔹 Llegenda */}
      <Legend />

      {/* 🔹 Vista principal */}
      {error && <div className="text-red-600">{error}</div>}
      {loading && <div className="text-gray-500">Carregant dades...</div>}

      {filters.mode === 'month' ? (
        <CalendarMonthView deals={deals} onCreated={reload} />
      ) : (
        <CalendarWeekView deals={deals} onCreated={reload} />
      )}
    </div>
  )
}
