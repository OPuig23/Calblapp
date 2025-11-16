// ✅ file: src/app/menu/calendar/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { RefreshCw, CalendarDays, Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/useCalendarData'
import CalendarMonthView from '@/components/calendar/CalendarMonthView'
import CalendarWeekView from '@/components/calendar/CalendarWeekView'
import CalendarNewEventModal from '@/components/calendar/CalendarNewEventModal'
import Legend from '@/components/calendar/CalendarLegend'
import CalendarFilters, { CalendarFilterChange } from '@/components/calendar/CalendarFilters'
import { useSession } from 'next-auth/react'
import FloatingCreateEventButton from '@/components/calendar/FloatingCreateEventButton'

export default function CalendarPage() {
  const [filters, setFilters] = useState<CalendarFilterChange>({
    mode: 'month',
    ln: 'Tots',
    stage: 'Tots',
  })

  const { deals, loading, error, reload } = useCalendarData({
    ln: filters.ln,
    stage: filters.stage,
    start: filters.start,
    end: filters.end,
  })

  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()

  const [syncing, setSyncing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  /* ───────────────────────────────────────────
     Detectar si estem en mòbil (<768px)
  ─────────────────────────────────────────── */
  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return
      setIsMobile(window.innerWidth < 768)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  /* ───────────────────────────────────────────
     Sincronització amb Zoho (només admin)
  ─────────────────────────────────────────── */
  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sync/zoho-to-firestore?mode=manual', {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error de sincronització')
      alert(
        `✅ Sincronització completada:\n${json.updated || 0} actualitzats, ${
          json.created || 0
        } nous.`
      )
      reload()
    } catch {
      alert('❌ Error sincronitzant amb Zoho.')
    } finally {
      setSyncing(false)
    }
  }

  /* ───────────────────────────────────────────
     Render
  ─────────────────────────────────────────── */
  return (
    <div className="relative w-full">
      {/* ░░ PANEL DE FILTRES MÒBIL (slideover simple) ░░ */}
      {isMobile && showFilters && (
        <div className="fixed inset-x-0 top-[56px] z-40 sm:hidden">
          <div className="bg-white border-b shadow-lg p-3 pb-4 rounded-b-2xl">
            <CalendarFilters
              defaultMode={filters.mode}
              onChange={(f) => setFilters(f)}
              onReset={() =>
                setFilters({ mode: 'month', ln: 'Tots', stage: 'Tots' })
              }
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(false)}
              >
                Tanca filtres
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ░░ CAPÇALERA LOCAL DEL MÒDUL CALENDARI ░░ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 mb-3">
        {/* Títol + descripció */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <CalendarDays size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-semibold leading-tight">
              Calendari comercial
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Esdeveniments per línia de negoci i etapa
            </p>
          </div>
        </div>

        {/* Accions dreta */}
        <div className="flex items-center gap-2 justify-end">
          {/* Botó filtres visible només mòbil */}
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1 sm:hidden"
            >
              <Filter size={14} />
              {showFilters ? 'Amaga filtres' : 'Mostra filtres'}
            </Button>
          )}

          {/* Nou esdeveniment (versió desktop) */}
          {!isMobile && (
            <CalendarNewEventModal
              date=""
              onSaved={reload}
              trigger={
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                >
                  <Plus size={14} />
                  Nou esdeveniment
                </Button>
              }
            />
          )}

          {/* Sync Zoho només admin i només desktop (per no embrutar mòbil) */}
          {!isMobile && role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1"
            >
              <RefreshCw
                size={14}
                className={syncing ? 'animate-spin text-blue-500' : ''}
              />
              {syncing ? 'Sincronitzant...' : 'Sincronitzar Zoho'}
            </Button>
          )}
        </div>
      </div>

      {/* ░░ FILTRES VERSIÓ DESKTOP ░░ */}
      {!isMobile && (
        <div className="mb-3">
          <CalendarFilters
            defaultMode={filters.mode}
            onChange={(f) => setFilters(f)}
            onReset={() =>
              setFilters({ mode: 'month', ln: 'Tots', stage: 'Tots' })
            }
          />
        </div>
      )}

      {/* ░░ LLEGENDA LN + ETAPES ░░ */}
      <Legend />

      {/* ░░ CONTINGUT PRINCIPAL: CALENDARI ░░ */}
      <div className="mt-3">
        {error && (
          <div className="text-red-600 text-sm mb-2">
            {String(error)}
          </div>
        )}
        {loading && (
          <div className="text-gray-500 text-sm mb-2">
            Carregant dades...
          </div>
        )}

        <div className="
          rounded-xl bg-white border shadow-sm
          overflow-hidden
          h-[calc(100dvh-260px)]
          sm:h-auto
        ">
          {filters.mode === 'week' ? (
            <CalendarWeekView
              deals={deals}
              start={filters.start}
              end={filters.end}
              onCreated={reload}
            />
          ) : (
            <CalendarMonthView
              deals={deals}
              start={filters.start}
              end={filters.end}
              onCreated={reload}
            />
          )}
        </div>
      </div>

      {/* ░░ BOTÓ FLOTANT + MODAL (MÒBIL) ░░ */}
      {isMobile && (
        <CalendarNewEventModal
          date=""
          onSaved={reload}
          trigger={<FloatingCreateEventButton />}
        />
      )}
    </div>
  )
}
