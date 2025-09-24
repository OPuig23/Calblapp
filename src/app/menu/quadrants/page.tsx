// File: src/app/menu/quadrants/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LayoutGrid, Calendar as CalendarIcon, Users } from 'lucide-react'
import CalendarView from './[id]/components/CalendarView'
import CalendarHourGrid from './[id]/components/CalendarHourGrid'
import QuadrantModal from './[id]/components/QuadrantModal'
import useEvents, { EventData } from '@/hooks/events/useEvents'
import SmartFilters from '@/components/filters/SmartFilters'
import ModuleHeader from '@/components/layout/ModuleHeader'

// Helpers
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normalizeDept = (s?: string) => unaccent(String(s || '').toLowerCase().trim())

export default function QuadrantsPage() {
  const router = useRouter()

  // Rang setmana actual
  const [range, setRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  useEffect(() => {
    const today = new Date()
    const dow = today.getDay()
    const diff = today.getDate() - dow + (dow === 0 ? -6 : 1)
    const monday = new Date(today)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    setRange({ start: monday.toISOString(), end: sunday.toISOString() })
  }, [])

  const canQuery = Boolean(range.start && range.end)

  // 🔹 Obtenim events amb quadrants
  const {
    events: allEvents = [],
    loading,
    error,
  } = useEvents('all', range.start, range.end, 'all', true)

  const events = allEvents.filter((ev) => ev.eventCode)

  // Comptadors
  const pendingCount = events.filter((e) => e.state === 'pending').length
  const draftCount = events.filter((e) => e.state === 'draft').length
  const confirmedCount = events.filter((e) => e.state === 'confirmed').length

  const [view, setView] = useState<'kanban' | 'calendar'>('kanban')
  const [sel, setSel] = useState<EventData | null>(null)

  const closeModal = () => setSel(null)

  return (
    <main className="p-6 space-y-6">
      {/* 🔹 Capçalera unificada */}
      <ModuleHeader
        icon={<LayoutGrid className="w-7 h-7 text-indigo-700" />}
        title="Creació de Quadrants"
        subtitle="Gestiona i organitza els quadrants del teu departament"
      />

      {/* 🔹 Filtres + accions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl bg-white shadow-sm border p-4 gap-4">
        <SmartFilters
          role="Direcció"
          modeDefault="week"
          showDepartment={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          onChange={(f) => {
            if (f.start && f.end) {
              setRange({ start: f.start, end: f.end })
            }
          }}
        />

        {/* Accions dreta */}
        <div className="flex items-center gap-3">
          {/* Toggle Quadrant/Horari */}
          <div className="flex rounded-md border bg-gray-50 overflow-hidden text-sm">
            <button
              onClick={() => setView('kanban')}
              className={`px-2 sm:px-3 py-1.5 flex items-center gap-1 ${
                view === 'kanban'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Quadrant</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-2 sm:px-3 py-1.5 flex items-center gap-1 ${
                view === 'calendar'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Horari</span>
            </button>
          </div>

          {/* Botó principal veure quadrants */}
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-3 sm:px-4 py-2 flex items-center gap-2"
            onClick={() => router.push('/menu/quadrants/drafts')}
          >
            🗂 <span className="hidden sm:inline">Veure Quadrants</span>
          </Button>
        </div>
      </div>

      {/* 🔹 Comptadors */}
      <Card className="rounded-2xl shadow border">
        <CardContent>
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <span className="font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-700" />
              Total esdeveniments: {events.length}
            </span>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1 text-yellow-600">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" /> Pendents: {pendingCount}
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 bg-blue-500 rounded-full" /> Esborranys: {draftCount}
              </span>
              <span className="flex items-center gap-1 text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> Confirmats: {confirmedCount}
              </span>
            </div>
          </div>

          {/* 🔹 Contingut */}
          {!canQuery ? (
            <div className="text-center py-12">Preparant la setmana…</div>
          ) : loading ? (
            <div className="text-center py-12">Carregant…</div>
          ) : error ? (
            <div className="text-center text-red-600 py-12">{String(error)}</div>
          ) : view === 'kanban' ? (
            <CalendarView events={events} onEventClick={setSel} range={range} />
          ) : (
            <CalendarHourGrid events={events} onEventClick={setSel} />
          )}
        </CardContent>
      </Card>

      {sel && <QuadrantModal open event={sel} onOpenChange={(o) => !o && closeModal()} />}
    </main>
  )
}
