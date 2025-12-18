'use client'

import React, { useEffect, useState, useCallback } from 'react'
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

const STORAGE_KEY = 'calblay.calendar.filters.v1'
const toIso = (d: Date) => format(d, 'yyyy-MM-dd')

/* ────────────────────────────────────────────── */
/* ESTAT INICIAL */
/* ────────────────────────────────────────────── */
const makeInitialState = (): CalendarViewState => {
  const today = new Date()

  const base: CalendarViewState = {
    mode: 'month',
    ln: 'all',
    stage: 'all',
    commercial: 'all',
    start: toIso(startOfMonth(today)),
    end: toIso(endOfMonth(today)),
  }

  if (typeof window === 'undefined') return base

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    return {
      ...base,
      ln: saved?.ln || 'all',
      stage: saved?.stage || 'all',
    }
  } catch {
    return base
  }
}

/* ────────────────────────────────────────────── */
/* COMPONENT */
/* ────────────────────────────────────────────── */
export default function CalendarPage() {
  const [state, setState] = useState<CalendarViewState>(makeInitialState)
  const { ln, stage, commercial, start, end, mode } = state
/* 🔒 Quan canvia la LN, tanquem el panell de filtres */
useEffect(() => {
  openFiltersPanel(false)
}, [ln])

  /* Persistència LN + Stage */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ln, stage })
      )
    } catch {}
  }, [ln, stage])

  /* Dades calendari (finals) */
  const {
    deals,
    loading,
    error,
    reload,
  } = useCalendarData({
    ln,
    stage,
    commercial,
    start,
    end,
  })

  /* Dades per calcular filtres (sense commercial) */
  const { deals: dealsForFilters } = useCalendarData({
    ln,
    stage,
    commercial: 'all',
    start,
    end,
  })

  /* Comercials disponibles */
  const comercialOptions = Array.from(
    new Set(
      dealsForFilters
        .map((d) => d.Comercial)
        .filter((x) => x && x.trim() !== '')
        .map((x) => x.trim())
    )
  ).sort()

  /* Netejar comercial si deixa de ser vàlid */
  useEffect(() => {
    if (
      commercial !== 'all' &&
      !comercialOptions.includes(commercial)
    ) {
      setState((prev) => ({
        ...prev,
        commercial: 'all',
      }))
    }
  }, [ln, start, end, comercialOptions])

  /* Sessió */
  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()

  /* UI */
  const [syncing, setSyncing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  const { setOpen: openFiltersPanel, setContent } = useFilters()

  /* Render filtres (únic punt) */
  const renderFilters = useCallback(() => (
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
          ln: 'all',
          stage: 'all',
          commercial: 'all',
        }))
      }
    />
  ), [ln, stage, commercial, comercialOptions])

  /* Obrir filtres */
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
          ln: 'all',
          stage: 'all',
          commercial: 'all',
        }))
      }
    />
  )
  openFiltersPanel(true)
}


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

  /* Navegació dates */
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

  const goToWeek = (delta: number) => {
    const shifted = addDays(parseISO(start), delta * 7)
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
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">
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
      <button
        onClick={() => setShowLegend((v) => !v)}
        className="text-xs sm:text-sm text-gray-600 mb-2 flex items-center gap-1"
      >
        {showLegend ? (
          <>Amagar llegenda <ChevronUp size={14} /></>
        ) : (
          <>Mostrar llegenda <ChevronDown size={14} /></>
        )}
      </button>

      {showLegend && <Legend />}

      {/* MODE */}
      <div className="flex justify-between items-center mb-3">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          <button onClick={switchToMonth} className={`px-3 py-1 text-sm rounded-full ${mode === 'month' ? 'bg-white shadow' : ''}`}>Mes</button>
          <button onClick={switchToWeek} className={`px-3 py-1 text-sm rounded-full ${mode === 'week' ? 'bg-white shadow' : ''}`}>Setmana</button>
        </div>

        {mode === 'month' ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => goToMonth(-1)}>‹</Button>
            <span className="capitalize">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => goToMonth(1)}>›</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => goToWeek(-1)}>‹</Button>
            <span>{weekLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => goToWeek(1)}>›</Button>
          </div>
        )}
      </div>

      {/* CONTINGUT */}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p className="text-gray-500 text-sm">Carregant dades…</p>}

      <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
        {mode === 'week' ? (
          <CalendarWeekView deals={deals} start={start} end={end} onCreated={reload} />
        ) : (
          <CalendarMonthView deals={deals} start={start} end={end} onCreated={reload} />
        )}
      </div>

      {/* ADD */}
      <CalendarNewEventModal
        date=""
        onSaved={reload}
        trigger={<FloatingAddButton onClick={() => {}} />}
      />
    </div>
  )
}
