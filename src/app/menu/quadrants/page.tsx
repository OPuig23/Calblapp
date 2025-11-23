// file: src/app/menu/quadrants/page.tsx
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { useSession } from 'next-auth/react'

import useFetch from '@/hooks/useFetch'
import type { QuadrantEvent } from '@/types/QuadrantEvent'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar, { type FiltersState } from '@/components/layout/FiltersBar'
import { useQuadrants } from '@/app/menu/quadrants/hooks/useQuadrants'
import QuadrantModal from './[id]/components/QuadrantModal'
import QuadrantCard from './drafts/components/QuadrantCard'

/* ────────────────────────────────────────────────
   Tipus interns
──────────────────────────────────────────────── */
type UnifiedEvent = QuadrantEvent & {
  id: string
  summary: string
  start: string
  end: string
  code?: string
  location?: string
  ln?: string
  responsable?: string
  commercial?: string | null
  numPax?: number | null
  workersSummary?: string
  displayStartTime?: string | null
  displayEndTime?: string | null
  quadrantStatus?: 'pending' | 'draft' | 'confirmed'
  draft?: any // dades del quadrant a Firestore (Draft)
}

/* ────────────────────────────────────────────────
   Component principal
──────────────────────────────────────────────── */
export default function QuadrantsPage() {
  // 📅 Rang inicial: setmana actual
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })

  // 🔹 Estat de filtres (compatible amb FiltersBar)
  const [filters, setFilters] = useState<FiltersState>(() => ({
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    mode: 'week',
    ln: '__all__',
    responsable: '__all__',
    location: '__all__',
    status: '__all__',
  }))

  // 🔹 Carrega esdeveniments per fer quadrants
  const {
    data: events = [],
    loading,
    error,
  } = useFetch('/api/events/quadrants', filters.start, filters.end)

  // 🔹 Sessió usuari → departament
  const { data: session } = useSession()
  const department =
    (
      session?.user?.department ||
      (session as any)?.department ||
      (session as any)?.dept ||
      'serveis'
    )
      .toString()
      .toLowerCase()

  // 🔹 Quadrants existents a Firestore
  const { quadrants, reload } = useQuadrants(
    department,
    filters.start,
    filters.end
  )

  // 🔄 Auto reload quan es crea / modifica un quadrant
  useEffect(() => {
    const handler = () => reload()
    window.addEventListener('quadrant:created', handler)
    return () => window.removeEventListener('quadrant:created', handler)
  }, [reload])

  // 🔹 Event seleccionat per obrir el QuadrantModal (autogenerar)
  const [selected, setSelected] = useState<UnifiedEvent | null>(null)

  // 🔹 Identificador del quadrant expandit (vista d’edició inline)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /* ────────────────────────────────────────────────
     Opcions filtres (LN / Responsable / Ubicació)
  ───────────────────────────────────────────────── */
  const lnOptions = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.ln || ev.lnLabel) {
        set.add((ev.ln || ev.lnLabel).toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  const responsables = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.responsable) {
        set.add(ev.responsable.toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  const locations = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.location) {
        set.add(ev.location.toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  /* ────────────────────────────────────────────────
     Fusionar events + estat + info del quadrant
  ───────────────────────────────────────────────── */
/* ────────────────────────────────────────────────
   Fusionar events + estat + info del quadrant
──────────────────────────────────────────────── */
const eventsWithStatus = useMemo<UnifiedEvent[]>(() => {
  const normalize = (v?: string) =>
    (v || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

  // Helper robust per extreure RESPONSABLE
  const extractResponsable = (ev: any, match: any): string => {
    if (typeof match?.responsableName === 'string' && match.responsableName.trim()) {
      return match.responsableName.trim()
    }

    if (
      match?.responsable &&
      typeof match.responsable === 'object' &&
      typeof match.responsable.name === 'string'
    ) {
      return match.responsable.name.trim()
    }

    if (typeof ev.responsable === 'string' && ev.responsable.trim()) {
      return ev.responsable.trim()
    }

    return ''
  }

  return (events as any[])
    .filter((ev) => ev.code && String(ev.code).trim() !== '')
    .map((ev) => {
      
      const key = normalize(ev.code)
      const match = quadrants.find((q: any) => normalize(q.code) === key)

      /* -------------------------------------------------
         1) Estat del quadrant
      --------------------------------------------------- */
      let quadrantStatus: 'pending' | 'draft' | 'confirmed' = 'pending'
      const s = String(match?.status || '').toLowerCase()
      if (s === 'draft') quadrantStatus = 'draft'
      else if (s === 'confirmed') quadrantStatus = 'confirmed'

      /* -------------------------------------------------
         2) Recollir tots els treballadors
      --------------------------------------------------- */
      const workerNames: string[] = []

      if (match?.responsableName) workerNames.push(match.responsableName)

      if (Array.isArray(match?.conductors)) {
        workerNames.push(
          ...match.conductors.map((c: any) => c?.name).filter(Boolean)
        )
      }

      if (Array.isArray(match?.treballadors)) {
        workerNames.push(
          ...match.treballadors.map((t: any) => t?.name).filter(Boolean)
        )
      }

      /* -------------------------------------------------
         3) Horaris (prioritat a quadrants)
      --------------------------------------------------- */
      const displayStartTime =
        match?.startTime || (ev.start ? String(ev.start).slice(11, 16) : null)

      const displayEndTime =
        match?.endTime || (ev.end ? String(ev.end).slice(11, 16) : null)

      /* -------------------------------------------------
         4) RESPONSABLE (prioritats)
      --------------------------------------------------- */
      const responsable = extractResponsable(ev, match)

      /* -------------------------------------------------
         5) RETURN FINAL (tot unificat)
      --------------------------------------------------- */
      return {
        ...(ev as QuadrantEvent),

        quadrantStatus,

        service: ev.service || match?.service || null,

        numPax:
          ev.numPax != null
            ? Number(ev.numPax)
            : match?.numPax != null
            ? Number(match.numPax)
            : null,

        commercial: ev.commercial || match?.commercial || null,

        ln: (ev.ln || ev.lnLabel || null) as string | null,

        location: ev.location || match?.location || null,

        responsable: match?.responsableName || '',

        workersSummary: workerNames.join(', '),

        displayStartTime,
        displayEndTime,

        draft: match || null,
      } as UnifiedEvent
    })
}, [events, quadrants])



  /* ────────────────────────────────────────────────
     Comptadors resum
  ───────────────────────────────────────────────── */
  const counts = useMemo(() => {
    let pending = 0
    let draft = 0
    let confirmed = 0

    for (const ev of eventsWithStatus) {
      if (ev.quadrantStatus === 'draft') draft++
      else if (ev.quadrantStatus === 'confirmed') confirmed++
      else pending++
    }

    return { pending, draft, confirmed }
  }, [eventsWithStatus])

  /* ────────────────────────────────────────────────
     Aplicació filtres
  ───────────────────────────────────────────────── */
  const filteredEvents = useMemo<UnifiedEvent[]>(() => {
    return eventsWithStatus.filter((ev) => {
      const evLn = (ev.ln || '').toString().trim().toLowerCase()
      const evResp = (ev.responsable || '').toString().trim().toLowerCase()
      const evLoc = (ev.location || '').toString().trim().toLowerCase()

      const fLn = (filters.ln || '').toLowerCase()
      const fResp = (filters.responsable || '').toLowerCase()
      const fLoc = (filters.location || '').toLowerCase()

      // Estat
      if (filters.status !== '__all__' && ev.quadrantStatus !== filters.status)
        return false

      // LN
      if (filters.ln !== '__all__' && fLn !== evLn) return false

      // Responsable
      if (filters.responsable !== '__all__' && !evResp.includes(fResp))
        return false

      // Ubicació
      if (filters.location !== '__all__' && fLoc !== evLoc) return false

      return true
    })
  }, [eventsWithStatus, filters])

  /* ────────────────────────────────────────────────
     Agrupació per dia (vista 1: agrupada per data)
  ───────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedEvent[]> = {}
    for (const ev of filteredEvents) {
      const day = ev.start.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(ev)
    }
    return Object.entries(map).sort(([a, b]) => a.localeCompare(b))
  }, [filteredEvents])

  /* ────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */
  return (
    <main className="space-y-6 px-4 pb-12">
      <ModuleHeader
        icon="📋"
        title="Quadrants"
        subtitle="Gestió setmanal per departament"
      />
{}
      {/* ✔ Barra de filtres (setmana, LN, responsable, ubicació, estat) */}
      <FiltersBar
        id="filters-bar"
        filters={filters}
        setFilters={(patch) =>
          setFilters((prev) => ({ ...prev, ...patch }))
        }
        lnOptions={lnOptions}
        responsables={responsables}
        locations={locations}
      />

      {/* ✔ Comptadors d’estat */}
      <div className="flex items-center justify-between bg-indigo-50 border rounded-2xl p-3 shadow-sm text-sm font-medium">
        <div className="flex gap-6 sm:gap-10">
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
      </div>

      {/* ✔ Estat de càrrega / error */}
      {loading && (
        <p className="text-center text-gray-500 py-10">
          Carregant quadrants…
        </p>
      )}

      {error && (
        <p className="text-center text-red-600 py-10">
          {String(error)}
        </p>
      )}

      {!loading && !error && grouped.length === 0 && (
        <p className="text-center text-gray-400 py-10">
          Cap esdeveniment trobat per aquest rang de dates.
        </p>
      )}

      {/* ✔ Taula compacta agrupada per dies */}
      {!loading && !error && grouped.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-indigo-100 text-indigo-900 font-semibold">
              <tr>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-left">Esdeveniment</th>
                <th className="px-3 py-2 text-left">LN</th>
                <th className="px-3 py-2 text-left">PAX</th>
                <th className="px-3 py-2 text-left">Finca / Ubicació</th>
                <th className="px-3 py-2 text-left">Servei</th>
                <th className="px-3 py-2 text-left">Treballadors</th>
                <th className="px-3 py-2 text-left">Horari</th>
                <th className="px-3 py-2 text-center">●</th>
              </tr>
            </thead>

            <tbody>
              {grouped.map(([day, evs]) => (
                <React.Fragment key={day}>
                  {/* Subcapçalera per dia */}
                  <tr className="bg-indigo-50 text-indigo-800">
                    <td colSpan={9} className="px-3 py-2 font-semibold">
                      {day}
                    </td>
                  </tr>

                  {/* Files per esdeveniment */}
                  {evs.map((ev) => {
                    const draft = (ev as any).draft

                    const dotClass =
                      ev.quadrantStatus === 'confirmed'
                        ? 'bg-green-500'
                        : ev.quadrantStatus === 'draft'
                        ? 'bg-blue-500'
                        : 'bg-yellow-400'

                    const startTime = ev.displayStartTime || '--:--'
                    const endTime = ev.displayEndTime || '--:--'

                    return (
                      <React.Fragment key={ev.id}>
                        <tr
                          className="cursor-pointer hover:bg-indigo-50 transition"
                          onClick={() => {
                            if (ev.quadrantStatus === 'pending') {
                              // No existeix quadrant → AUTOGENERAR
                              setSelected(ev)
                            } else if (draft && draft.id) {
                              // Ja existeix draft → OBRIR / TANCAR EDICIÓ INLINE
                              setExpandedId((prev) =>
                                prev === draft.id ? null : draft.id
                              )
                            }
                          }}
                        >
                          <td className="px-3 py-2">
                            {ev.responsable || '—'}
                          </td>
                          <td className="px-3 py-2">{ev.summary}</td>
                          <td className="px-3 py-2">{ev.ln || '—'}</td>
                          <td className="px-3 py-2">{ev.numPax ?? '—'}</td>
                          <td className="px-3 py-2">
                            {ev.location || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {ev.service || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {ev.workersSummary || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {startTime} – {endTime}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-3 h-3 rounded-full ${dotClass}`}
                            />
                          </td>
                        </tr>

                        {/* Fila d’ediciò inline del quadrant (DraftsTable via QuadrantCard) */}
                        {draft && draft.id && expandedId === draft.id && (
                          <tr>
                            <td colSpan={9} className="bg-white border-t px-3 py-3">
                              <div className="rounded-xl border bg-gray-50 p-4">
                               <QuadrantCard quadrant={draft} autoExpand />

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✔ QuadrantModal per autogenerar quadrant quan està pendent */}
      {selected && (
        <QuadrantModal
          open
          event={selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      )}
    </main>
  )
}
