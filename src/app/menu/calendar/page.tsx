//file: src/app/menu/calendar/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  RefreshCw,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/useCalendarData'
import CalendarMonthView from '@/components/calendar/CalendarMonthView'
import CalendarWeekView from '@/components/calendar/CalendarWeekView'
import CalendarNewEventModal from '@/components/calendar/CalendarNewEventModal'
import Legend from '@/components/calendar/CalendarLegend'
import CalendarFilters from '@/components/calendar/CalendarFilters'
import { useSession } from 'next-auth/react'
import FilterButton from '@/components/ui/filter-button'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { useFilters } from '@/context/FiltersContext'

import {
  addMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
} from 'date-fns'

/* ────────────────────────────────────────────── */
/* TYPES */
/* ────────────────────────────────────────────── */
type ViewMode = 'month' | 'week'

type CalendarViewState = {
  mode: ViewMode
  ln: string
  stage: string
  commercial: string
  start: string
  end: string
}

const toIso = (d: Date) => format(d, 'yyyy-MM-dd')

/* ────────────────────────────────────────────── */
/* ESTAT INICIAL */
/* ────────────────────────────────────────────── */
const makeInitialState = (): CalendarViewState => {
  const today = new Date()
  return {
    mode: 'month',
    ln: 'Tots',
    stage: 'Tots',
    commercial: 'Tots',
    start: toIso(startOfMonth(today)),
    end: toIso(endOfMonth(today)),
  }
}

/* ────────────────────────────────────────────── */
/* COMPONENT PAGE */
/* ────────────────────────────────────────────── */

export default function CalendarPage() {
  const [state, setState] = useState<CalendarViewState>(() => makeInitialState())
  const { ln, stage, commercial, start, end, mode } = state

  /* Dades del calendari */
  const { deals, loading, error, reload } = useCalendarData({
    ln,
    stage,
    commercial,
    start,
    end,
  })

  /* Llista única de comercials */
  const comercialOptions = Array.from(
    new Set(
      deals
        .map((d) => d.Comercial)
        .filter((x) => x && x.trim() !== '')
        .map((x) => x.trim())
    )
  ).sort()

  /* Sessió */
  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()

  /* Estats visuals */
  const [syncing, setSyncing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  /* Slideover global */
  const { setOpen: openFiltersPanel, setContent } = useFilters()

  /* Detectar mobile */
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  /* Sync Zoho */
  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch('/api/sync/zoho-to-firestore?mode=manual')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      alert(`Sincronització: ${json.updated} actualitzats, ${json.created} nous`)
      reload()
    } catch {
      alert('❌ Error sincronitzant amb Zoho.')
    } finally {
      setSyncing(false)
    }
  }

  /* ────────────────────────────────────────────── */
  /* OBRIR PANEL DE FILTRES */
  /* ────────────────────────────────────────────── */

  const openFilters = () => {
    setContent(
      <CalendarFilters
        ln={ln}
        stage={stage}
        commercial={commercial}
        comercialOptions={comercialOptions}
        onChange={(f) =>
          setState((prev) => ({
            ...prev,
            ...f,
          }))
        }
        onReset={() =>
          setState((prev) => ({
            ...prev,
            ln: 'Tots',
            stage: 'Tots',
            commercial: 'Tots',
          }))
        }
      />
    )
    openFiltersPanel(true)
  }

  /* ────────────────────────────────────────────── */
  /* SELECTOR MES */
  /* ────────────────────────────────────────────── */
  const monthAnchor = parseISO(start)
  const monthLabel = monthAnchor.toLocaleDateString('ca-ES', {
    month: 'long',
    year: 'numeric',
  })

  const goToMonth = (delta: number) => {
    const base = startOfMonth(monthAnchor)
    const newBase = addMonths(base, delta)
    setState((prev) => ({
      ...prev,
      mode: 'month',
      start: toIso(startOfMonth(newBase)),
      end: toIso(endOfMonth(newBase)),
    }))
  }

  /* ────────────────────────────────────────────── */
  /* SELECTOR SETMANA */
  /* ────────────────────────────────────────────── */
  const weekAnchor = parseISO(start)
  const goToWeek = (delta: number) => {
    const shifted = addDays(weekAnchor, delta * 7)
    setState((prev) => ({
      ...prev,
      mode: 'week',
      start: toIso(startOfWeek(shifted, { weekStartsOn: 1 })),
      end: toIso(endOfWeek(shifted, { weekStartsOn: 1 })),
    }))
  }

  const weekLabel =
    `${parseISO(start).toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'short',
    })} – ${parseISO(end).toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'short',
    })}`

  /* ────────────────────────────────────────────── */
  /* CANVI INSTANTANI DE MODE (PILLS) */
  /* ────────────────────────────────────────────── */

  const switchToMonth = () => {
    const base = parseISO(start)
    setState((prev) => ({
      ...prev,
      mode: 'month',
      start: toIso(startOfMonth(base)),
      end: toIso(endOfMonth(base)),
    }))
  }

  const switchToWeek = () => {
    const base = parseISO(start)
    setState((prev) => ({
      ...prev,
      mode: 'week',
      start: toIso(startOfWeek(base, { weekStartsOn: 1 })),
      end: toIso(endOfWeek(base, { weekStartsOn: 1 })),
    }))
  }

  /* ────────────────────────────────────────────── */
  /* RENDER */
  /* ────────────────────────────────────────────── */

  return (
    <div className="relative w-full">

      {/* CAPÇALERA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 mb-3">
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

        <div className="flex items-center gap-2">
          <FilterButton onClick={openFilters} />

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

      {/* LLEGENDA */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-600 hover:text-gray-800"
        >
          {showLegend ? (
            <>Amagar llegenda <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Mostrar llegenda <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {showLegend && (
        <div className="mb-3">
          <Legend />
        </div>
      )}

      {/* PILLS + SELECTOR */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        {/* Pills */}
        <div className="flex justify-start">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={switchToMonth}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
                mode === 'month'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={switchToWeek}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
                mode === 'week'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Setmana
            </button>
          </div>
        </div>

        {/* Selector Mes */}
        {mode === 'month' && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Button size="icon" variant="ghost" onClick={() => goToMonth(-1)}>‹</Button>
            <span className="min-w-[140px] text-center capitalize">{monthLabel}</span>
            <Button size="icon" variant="ghost" onClick={() => goToMonth(1)}>›</Button>
          </div>
        )}

        {/* Selector Setmana */}
        {mode === 'week' && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Button size="icon" variant="ghost" onClick={() => goToWeek(-1)}>‹</Button>
            <span className="min-w-[140px] text-center">{weekLabel}</span>
            <Button size="icon" variant="ghost" onClick={() => goToWeek(1)}>›</Button>
          </div>
        )}
      </div>

      {/* CONTINGUT */}
      <div>
        {error && (
          <div className="text-red-600 text-sm mb-2">{String(error)}</div>
        )}
        {loading && (
          <div className="text-gray-500 text-sm mb-2">Carregant dades...</div>
        )}

        <div className="rounded-xl bg-white border shadow-sm overflow-hidden h-[calc(100dvh-260px)] sm:h-auto">
          {mode === 'week' ? (
            <CalendarWeekView deals={deals} start={start} end={end} onCreated={reload} />
          ) : (
            <CalendarMonthView deals={deals} start={start} end={end} onCreated={reload} />
          )}
        </div>
      </div>

      {/* BOTÓ (+) */}
      <CalendarNewEventModal
        date=""
        onSaved={reload}
        trigger={<FloatingAddButton onClick={() => {}} />}
      />
    </div>
  )
}
