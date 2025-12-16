//filename: src/app/menu/events/page.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { startOfWeek, endOfWeek, format } from 'date-fns'

import useEvents from '@/hooks/events/useEvents'
import EventsDayGroup from '@/components/events/EventsDayGroup'
import EventMenuModal from '@/components/events/EventMenuModal'
import EventAvisosReadOnlyModal from '@/components/events/EventAvisosReadOnlyModal'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar, { FiltersState } from '@/components/layout/FiltersBar'

/* ================= Utils ================= */
const normalize = (s?: string | null) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/* ================= Tipus ================= */
type SessionUser = {
  id?: string
  role?: string
  department?: string
  name?: string
}

type EventMenuData = {
  id: string
  summary: string
  start: string
  eventCode?: string | null
  responsableName?: string
  lnKey?: string
  isResponsible?: boolean
  fincaId?: string | null
  fincaCode?: string | null
}

/* ================= Page ================= */
export default function EventsPage() {
  const { data: session } = useSession()

  const role = String(session?.user?.role || '').toLowerCase()
  const userDept = String((session?.user as SessionUser)?.department || 'total').toLowerCase()

  const scope: 'all' | 'mine' = role === 'treballador' ? 'mine' : 'all'
  const includeQuadrants = role === 'treballador'

  /* ================= Setmana ================= */
  const initial: FiltersState = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 })
    const e = endOfWeek(new Date(), { weekStartsOn: 1 })
    return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }
  }, [])

  const [filters, setFilters] = useState<FiltersState>(initial)

  const fromISO = `${filters.start}T00:00:00.000Z`
  const toISO = `${filters.end}T23:59:59.999Z`

  const { events, loading, error, responsablesDetailed } =
    useEvents(userDept, fromISO, toISO, scope, includeQuadrants)

  /* ================= Filtrat ================= */
  let filteredEvents = events

  if (filters.ln && filters.ln !== '__all__') {
    filteredEvents = filteredEvents.filter(ev => ev.lnKey === filters.ln)
  }

  if (filters.responsable && filters.responsable !== '__all__') {
    filteredEvents = filteredEvents.filter(ev => {
      const evResps = (ev.responsableName || '')
        .split(',')
        .map(r => normalize(r))
        .filter(Boolean)
      return evResps.includes(normalize(filters.responsable))
    })
  }

  if (filters.location && filters.location !== '__all__') {
    filteredEvents = filteredEvents.filter(
      ev => normalize(ev.locationShort) === normalize(filters.location)
    )
  }

  /* ================= Agrupació ================= */
  const grouped = filteredEvents.reduce<Record<string, typeof filteredEvents>>((acc, ev) => {
    const day = ev.start.slice(0, 10)
    acc[day] ||= []
    acc[day].push(ev)
    return acc
  }, {})

  /* ================= MODALS ================= */
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventMenuData | null>(null)

  const [isAvisosOpen, setAvisosOpen] = useState(false)
  const [avisosEventCode, setAvisosEventCode] = useState<string | null>(null)

  /* ================= HANDLER CENTRAL ================= */
  const handleEventClick = (ev: any, mode: 'menu' | 'avisos' = 'menu') => {
    if (mode === 'avisos') {
      setAvisosEventCode(ev.eventCode ?? null)
      setAvisosOpen(true)
      return
    }

    setSelectedEvent({
      id: ev.id,
      summary: ev.summary,
      start: ev.start,
      responsableName: ev.responsableName,
      lnKey: ev.lnKey,
      isResponsible: ev.isResponsible,
      fincaId: ev.fincaId ?? null,
      fincaCode: ev.fincaCode ?? null,
      eventCode: ev.eventCode ?? null,
    })

    setMenuOpen(true)
  }

  const userForModal = {
    id: (session?.user as SessionUser)?.id,
    role: (session?.user as SessionUser)?.role,
    department: (session?.user as SessionUser)?.department,
    name: (session?.user as SessionUser)?.name,
  }

  /* ================= Render ================= */
  return (
    <div className="space-y-6">
      <div className="px-4">
        <ModuleHeader
          icon="📅"
          title="ESDEVENIMENTS"
          subtitle="Consulta i gestiona els esdeveniments"
        />
      </div>

      <FiltersBar
        filters={filters}
        setFilters={f => setFilters(prev => ({ ...prev, ...f }))}
        visibleFilters={[]}
        hiddenFilters={['ln', 'responsable', 'location']}
        lnOptions={Array.from(new Set(filteredEvents.map(e => e.lnKey).filter(Boolean))).sort()}
        responsables={
          responsablesDetailed?.map(r => r.name).filter(Boolean) ?? []
        }
        locations={Array.from(
          new Set(filteredEvents.map(e => e.locationShort || e.location).filter(Boolean))
        ).sort()}
      />

      <div className="px-4">
        {loading && <p className="text-gray-500">Carregant esdeveniments…</p>}
        {error && <p className="text-red-600">{String(error)}</p>}

        {!loading && !error && filteredEvents.length === 0 && (
          <p>No hi ha esdeveniments per mostrar.</p>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, evs]) => (
                <EventsDayGroup
                  key={day}
                  date={day}
                  events={evs}
                  onEventClick={handleEventClick}
                />
              ))}
          </div>
        )}
      </div>

      {/* MODAL MENU */}
      {isMenuOpen && selectedEvent && (
        <EventMenuModal
          event={selectedEvent}
          user={userForModal}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* MODAL AVISOS READ-ONLY */}
      <EventAvisosReadOnlyModal
        open={isAvisosOpen}
        onClose={() => setAvisosOpen(false)}
        eventCode={avisosEventCode}
      />
    </div>
  )
}
