//file: src/app/menu/quadrants/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import useEvents, { EventData } from '@/hooks/events/useEvents'
import type { QuadrantEvent } from '@/types/QuadrantEvent'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar from '@/components/layout/FiltersBar'
import QuadrantModal from './[id]/components/QuadrantModal'
import QuadrantDayGroup from './[id]/components/CalendarView'


// 🔹 Tipus unificat per evitar discrepàncies
type UnifiedEvent = EventData & QuadrantEvent

export default function QuadrantsPage() {
  const router = useRouter()

  // 📅 Setmana actual per defecte
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  })

  // 🔹 Dades d’esdeveniments amb quadrants
  const { events = [], loading, error } = useEvents('all', range.start, range.end, 'all', true)
  const [selected, setSelected] = useState<UnifiedEvent | null>(null)

  // ==========================================================
  // 🎯 FILTRE: només mostrar esdeveniments amb codi vàlid
  // Format vàlid → comença amb E, C, F, A o PM + mínim 4 xifres
  // Exemple: C2025, PM2044, E1001...
  // ==========================================================
  const validCodePattern = /(^|\s)(PM|E|C|F|A)\d{4,}(\s|$)/i
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (ev) =>
          validCodePattern.test(ev.eventCode || '') ||
          validCodePattern.test(ev.summary || '')
      ),
    [events]
  )

  // 🔹 Comptadors d’estat
  const counts = useMemo(
    () => ({
      pending: filteredEvents.filter((e) => e.state === 'pending').length,
      draft: filteredEvents.filter((e) => e.state === 'draft').length,
      confirmed: filteredEvents.filter((e) => e.state === 'confirmed').length,
    }),
    [filteredEvents]
  )

  // 🔹 Agrupació per dia
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedEvent[]> = {}
    for (const ev of filteredEvents as UnifiedEvent[]) {
      const day = ev.start?.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(ev)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEvents])

  // ==========================================================
  // 🖥️ Render
  // ==========================================================
  return (
    <main className="space-y-5 px-4 pb-8">
      {/* 🟦 Capçalera del mòdul */}
      <ModuleHeader
        icon={<LayoutGrid className="w-6 h-6 text-indigo-700" />}
        title="Quadrants"
        subtitle="Gestió setmanal per departament"
      />

      {/* 📅 Barra de filtres amb SmartFilters intern i botó lateral */}
      <FiltersBar
        filters={range}
        setFilters={(f) => {
          if (f.start && f.end) setRange({ start: f.start, end: f.end })
        }}
      />

      {/* 🔢 Comptadors d’estat */}
      <div className="flex justify-around sm:justify-center sm:gap-10 bg-gradient-to-r from-indigo-50 to-blue-50 border rounded-2xl p-3 shadow-sm text-sm font-medium">
        <span className="flex items-center gap-2 text-yellow-700">
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
          Pendents: {counts.pending}
        </span>
        <span className="flex items-center gap-2 text-blue-700">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
          Esborranys: {counts.draft}
        </span>
        <span className="flex items-center gap-2 text-green-700">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          Confirmats: {counts.confirmed}
        </span>
      </div>

      {/* 📄 Llistat de quadrants agrupats per dia */}
      {loading && <p className="text-gray-500 text-center py-10">Carregant quadrants…</p>}
      {error && <p className="text-red-600 text-center py-10">{String(error)}</p>}
      {!loading && !error && grouped.length === 0 && (
        <p className="text-gray-400 text-center py-10">
          Cap quadrant trobat per aquesta setmana.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([day, evs]: [string, UnifiedEvent[]]) => (
            <QuadrantDayGroup
              key={day}
              date={day}
              events={evs}
              onEventClick={(ev: UnifiedEvent) => setSelected(ev)}
            />
          ))}
        </div>
      )}

      {/* 🪟 Modal de quadrant */}
      {selected && (
        <QuadrantModal
          open
          event={selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}

      {/* 🔘 Botó veure tots */}
<div className="flex justify-end mt-6">
  <button
    onClick={() =>
      router.push(
        `/menu/quadrants/drafts?start=${range.start}&end=${range.end}`
      )
    }
    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full px-5 py-2 shadow"
  >
    🗂 Veure tots els quadrants
  </button>
</div>

    </main>
  )
}
