// ✅ file: src/app/menu/quadrants/page.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import useFetch from '@/hooks/useFetch'
import type { QuadrantEvent } from '@/types/QuadrantEvent'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar from '@/components/layout/FiltersBar'
import QuadrantModal from './[id]/components/QuadrantModal'
import QuadrantDayGroup from './[id]/components/CalendarView'
import { useQuadrants } from '@/app/menu/quadrants/hooks/useQuadrants'
import { useSession } from 'next-auth/react'

type UnifiedEvent = QuadrantEvent & {
  id: string
  summary: string
  start: string
  end: string
  code?: string
  location?: string
  StageGroup?: string
  ln?: string
}

export default function QuadrantsPage() {
  const router = useRouter()

  // 📅 Setmana actual per defecte
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })

  const [range, setRange] = useState({
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  })

  // 🔹 Dades d’esdeveniments stage_verd amb code
  const {
    data: events = [],
    loading,
    error,
  } = useFetch('/api/events/quadrants', range.start, range.end)

  const [selected, setSelected] = useState<UnifiedEvent | null>(null)

  // 🔹 Departament usuari
  const { data: session } = useSession()
  const department =
    (session?.user?.department ||
      (session as any)?.department ||
      (session as any)?.dept ||
      'serveis')
      .toString()
      .toLowerCase()

  // 🔹 Quadrants existents per fer match
  const { quadrants, reload } = useQuadrants(department, range.start, range.end)

  // 🔄 Auto-reload quan un quadrant és creat
  useEffect(() => {
    const handler = () => {
      reload()
    }
    window.addEventListener('quadrant:created', handler)
    return () => window.removeEventListener('quadrant:created', handler)
  }, [reload])

  // 🔹 Només esdeveniments amb code
  const filteredEvents = useMemo(
    () => events.filter(ev => ev.code && ev.code.trim() !== ''),
    [events]
  )

  // 🔹 Comptadors
  const [counts, setCounts] = useState({ pending: 0, draft: 0, confirmed: 0 })

  useEffect(() => {
    let pending = 0
    let draft = 0
    let confirmed = 0

    for (const e of filteredEvents) {
      const key = (e.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const match = quadrants.find(q =>
        (q.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === key
      )

      if (!match) pending++
      else if (String(match.status).toLowerCase() === 'draft') draft++
      else if (String(match.status).toLowerCase() === 'confirmed') confirmed++
      else pending++
    }

    setCounts({ pending, draft, confirmed })
  }, [filteredEvents, quadrants])

  // 🔹 Agrupació per dia
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedEvent[]> = {}
    for (const ev of filteredEvents) {
      const day = ev.start.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(ev)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEvents])

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <main className="space-y-5 px-4 pb-8">
      
      <ModuleHeader
        icon={<LayoutGrid className="w-6 h-6 text-indigo-700" />}
        title="Quadrants"
        subtitle="Gestió setmanal per departament"
      />

 <FiltersBar
  id="filters-bar"
  filters={range}
  setFilters={(f) => {
    if (f.start && f.end) setRange({ start: f.start, end: f.end })
  }}
/>



      {/* 🔵 Comptadors */}
      <div className="flex justify-around sm:justify-center sm:gap-10 bg-gradient-to-r from-indigo-50 to-blue-50 border rounded-2xl p-3 shadow-sm text-sm font-medium">
        <span className="flex items-center gap-2 text-yellow-700">
          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></span>
          Pendents: {counts.pending}
        </span>

        <span className="flex items-center gap-2 text-blue-700">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
          Esborranys: {counts.draft}
        </span>

        <span className="flex items-center gap-2 text-green-700">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          Confirmats: {counts.confirmed}
        </span>
      </div>

      {/* 🟣 Llistat */}
      {loading && (
        <p className="text-gray-500 text-center py-10">Carregant quadrants…</p>
      )}

      {error && (
        <p className="text-red-600 text-center py-10">
          {String(error)}
        </p>
      )}

      {!loading && !error && grouped.length === 0 && (
        <p className="text-gray-400 text-center py-10">
          Cap quadrant trobat per aquesta setmana.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([day, evs]) => (
            <QuadrantDayGroup
  key={day}
  date={day}
  events={evs}
  onEventClick={(ev) => setSelected(ev)}
  department={department}
  start={range.start}
  end={range.end}
/>

          ))}
        </div>
      )}

      {/* 🔵 Modal */}
      {selected && (
        <QuadrantModal
          open
          event={selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={() =>
            router.push(`/menu/quadrants/drafts?start=${range.start}&end=${range.end}`)
          }
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full px-5 py-2 shadow"
        >
          🗂 Veure tots els quadrants
        </button>
      </div>




    </main>
  )
}
