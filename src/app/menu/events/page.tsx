// filename: src/app/menu/events/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import React, { useMemo, useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import useEvents, { EventData } from '@/hooks/events/useEvents'
import EventsDayGroup from '@/components/events/EventsDayGroup'
import EventMenuModal from '@/components/events/EventMenuModal'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar, { FiltersState } from '@/components/layout/FiltersBar'

/* ================= Utils ================= */
const normalize = (s?: string | null) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/* ================= Tipus auxiliars ================= */
interface ExtendedEventData extends EventData {
  lnKey?: string
  isResponsible?: boolean
}

type SessionUser = {
  id?: string
  role?: string
  department?: string
  name?: string
}

/* ================= Page ================= */
export default function EventsPage() {
  const { data: session } = useSession()
  const role = String(session?.user?.role || '').toLowerCase()
  const userDept = String((session?.user as SessionUser)?.department || '').toLowerCase()
  const scope: 'all' | 'mine' = role === 'treballador' ? 'mine' : 'all'
  const includeQuadrants = role === 'treballador'

  // 🔹 Setmana actual (rang per defecte)
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
      const selResp = normalize(filters.responsable)
      return evResps.includes(selResp)
    })
  }

  if (filters.location && filters.location !== '__all__') {
    filteredEvents = filteredEvents.filter(
      ev => normalize(ev.locationShort) === normalize(filters.location)
    )
  }

  /* ================= Opcions derivades ================= */
  const availableLnOptions = useMemo(() => {
    const set = new Set<string>()
    filteredEvents.forEach(ev => {
      if (ev.lnKey) set.add(ev.lnKey)
    })
    return Array.from(set).sort()
  }, [filteredEvents])

  const availableLocations = useMemo(() => {
    return Array.from(
      new Set(filteredEvents.map(ev => ev.locationShort || ev.location || '').filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'ca'))
  }, [filteredEvents])

  const scopedResponsables = useMemo(() => {
    if (!responsablesDetailed || responsablesDetailed.length === 0) return []
    let responsables: string[] = []
    if (role === 'admin' || role === 'direccio') {
      responsables = responsablesDetailed.map(r => r.name)
    } else {
      responsables = responsablesDetailed
        .filter(r => userDept === 'total' || normalize(r.department) === userDept)
        .map(r => r.name)
    }
    return Array.from(new Set(responsables)).sort((a, b) => a.localeCompare(b, 'ca'))
  }, [role, userDept, responsablesDetailed])

  /* ================= Agrupació ================= */
  const grouped = filteredEvents.reduce((acc, ev) => {
    const dayKey = ev.start.slice(0, 10)
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(ev)
    return acc
  }, {} as Record<string, EventData[]>)

  /* ================= Modal ================= */
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Partial<ExtendedEventData> | null>(null)

  const openMenu = (ev: ExtendedEventData) => {
    setSelectedEvent({
      id: ev.id,
      summary: ev.summary,
      start: ev.start,
      responsableName: ev.responsableName,
      lnKey: ev.lnKey,
      isResponsible: ev.isResponsible,
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
      {/* 🔹 Capçalera amb padding lateral */}
      <div className="px-4 mb-2">
        <ModuleHeader
          icon="📅"
          title="ESDEVENIMENTS"
          subtitle="Consulta i gestiona els esdeveniments"
        />
      </div>

      {/* 🔹 Barra de filtres a pantalla completa (sense padding) */}
      <FiltersBar
        filters={filters}
        setFilters={f => setFilters(prev => ({ ...prev, ...f }))}
        visibleFilters={[]}
        hiddenFilters={['ln', 'responsable', 'location']}
        lnOptions={availableLnOptions}
        responsables={scopedResponsables}
        locations={availableLocations}
      />

      {/* 🔹 Contingut principal amb padding lateral */}
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
                  onEventClick={openMenu}
                />
              ))}
          </div>
        )}
      </div>

      {/* 🔹 Modal de menú d’esdeveniment */}
      {isMenuOpen && selectedEvent && (
        <EventMenuModal
          event={{
            id: selectedEvent.id || '',
            summary: selectedEvent.summary || '',
            start: selectedEvent.start!,
            responsableName: selectedEvent.responsableName,
            lnKey: selectedEvent.lnKey,
            isResponsible: selectedEvent.isResponsible,
          }}
          user={userForModal}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
