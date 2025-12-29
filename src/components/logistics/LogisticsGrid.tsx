// file: src/components/logistics/LogisticsGrid.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { RefreshCcw, CalendarClock } from 'lucide-react'
import { useSession } from 'next-auth/react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useLogisticsData } from '@/hooks/useLogisticsData'

type EditedMap = Record<string, { PreparacioData?: string; PreparacioHora?: string }>

function parseDM(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(value?.trim() || '')
  if (!m) return null
  const d = Number(m[1])
  const mm = Number(m[2])
  if (d < 1 || d > 31 || mm < 1 || mm > 12) return null
  return { d, m: mm }
}

function toISOFromDM(dm: string, year: number) {
  const p = parseDM(dm)
  if (!p) return ''
  const dd = String(p.d).padStart(2, '0')
  const mm = String(p.m).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function fmtDM(dateIsoOrEmpty: string) {
  if (!dateIsoOrEmpty) return ''
  const d = new Date(dateIsoOrEmpty)
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd/MM', { locale: ca })
}

export default function LogisticsGrid() {
  const { data: session } = useSession()
  const role = (session?.user?.role || '').toLowerCase()
  const isWorker = role === 'treballador'
  const isManager = role === 'cap' || role === 'admin' || role === 'direccio'

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const { events, refresh, loading } = useLogisticsData(dateRange)
  const [updating, setUpdating] = useState(false)
  const [edited, setEdited] = useState<EditedMap>({})
  const [rows, setRows] = useState(events)

  useEffect(() => {
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => {
        const aHas = !!(a.PreparacioData && a.PreparacioHora)
        const bHas = !!(b.PreparacioData && b.PreparacioHora)
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        if (!aHas && !bHas) {
          return new Date(a.DataInici).getTime() - new Date(b.DataInici).getTime()
        }
        const d1 = new Date(`${a.PreparacioData}T${a.PreparacioHora || '00:00'}`).getTime()
        const d2 = new Date(`${b.PreparacioData}T${b.PreparacioHora || '00:00'}`).getTime()
        return d1 - d2
      })
      setRows(sorted)
    } else {
      setRows([])
    }
  }, [events])

  const handleFilterChange = (f: SmartFiltersChange) => {
    if (f.start && f.end) setDateRange({ start: f.start, end: f.end })
  }

  const handleRefresh = async () => {
    setUpdating(true)
    await refresh()
    setUpdating(false)
  }

  const handleConfirm = async () => {
    setUpdating(true)

    const ids = Object.keys(edited)
    const errors: string[] = []

    for (const id of ids) {
      const original = rows.find((r) => r.id === id)
      const payload: { id: string; PreparacioData?: string; PreparacioHora?: string } = { id }

      if (edited[id]?.PreparacioData) {
        const year = original ? new Date(original.DataInici).getFullYear() : new Date().getFullYear()
        payload.PreparacioData = toISOFromDM(edited[id].PreparacioData!, year)
      }
      if (edited[id]?.PreparacioHora) {
        payload.PreparacioHora = edited[id].PreparacioHora!
      }

      const res = await fetch('/api/logistics/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        errors.push(id)
      }
    }

    await refresh()

    setEdited({})
    setUpdating(false)

    if (errors.length) {
      console.error('Errors guardant preparacions per IDs:', errors)
      alert("Algunes files no s'han pogut guardar. Revisa la consola.")
    }
  }

  return (
    <div className="mt-4 w-full bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <SmartFilters
          showStatus={false}
          modeDefault="week"
          onChange={handleFilterChange}
        />
      </div>

      {isWorker ? (
        <WorkerGroupedView events={rows} loading={loading} />
      ) : (
        <EditableTable
          rows={rows}
          edited={edited}
          setEdited={setEdited}
          isManager={isManager}
          loading={loading}
        />
      )}

      {isManager && (
        <div className="p-4 flex justify-between border-t bg-gray-50">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-sm px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 transition"
          >
            <RefreshCcw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            Actualitzar
          </button>
          <button
            onClick={handleConfirm}
            disabled={updating}
            className={`px-4 py-2 text-white rounded-lg text-sm transition-colors ${
              updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {updating ? 'Guardant...' : 'Confirmar ordre'}
          </button>
        </div>
      )}
    </div>
  )
}

function WorkerGroupedView({ events, loading }: { events: any[]; loading: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    events.forEach(ev => {
      const key = ev.PreparacioData || ev.DataInici?.toString() || 'sense-data'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return Array.from(map.entries()).sort((a, b) => {
      const da = new Date(a[0]).getTime()
      const db = new Date(b[0]).getTime()
      return da - db
    })
  }, [events])

  if (loading) {
    return <div className="p-4 text-center text-gray-500 text-sm">Carregant dades...</div>
  }

  if (!groups.length) {
    return <div className="p-4 text-center text-gray-400 text-sm">No hi ha dades disponibles.</div>
  }

  return (
    <div className="divide-y">
      {groups.map(([dayIso, items]) => {
        const label = dayIso && dayIso !== 'sense-data'
          ? (() => {
              const d = parseISO(dayIso)
              const dowIdx = d.getDay() // 0=dg ... 6=ds
              const dowMap = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds']
              const dow = dowMap[dowIdx] || format(d, 'EEE', { locale: ca })
              return `${dow} ${format(d, 'dd/LL/yy', { locale: ca })}`
            })()
          : 'Sense data de preparació'

        // Ordenem les files del dia per hora de preparació
        const ordered = [...items].sort((a, b) => {
          const ha = a.PreparacioHora || ''
          const hb = b.PreparacioHora || ''
          if (ha && hb) return ha.localeCompare(hb)
          if (ha) return -1
          if (hb) return 1
          return 0
        })

        return (
          <div key={dayIso} className="pb-4">
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-900">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                <span className="uppercase tracking-wide">{label}</span>
              </div>
              <div className="text-xs font-semibold text-pink-600">
                {ordered.length} prep
              </div>
            </div>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full sm:min-w-[560px] w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left w-24">Hora prep.</th>
                    <th className="px-3 py-2 text-left">Nom esdeveniment</th>
                    <th className="px-3 py-2 text-left w-16">Pax</th>
                    <th className="px-3 py-2 text-left">Ubicació</th>
                    <th className="px-3 py-2 text-left w-28">Data event</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map(ev => (
                    <tr key={ev.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-700">{ev.PreparacioHora || '—'}</td>
                      <td className="px-3 py-2 text-slate-800 font-semibold">{ev.NomEvent}</td>
                      <td className="px-3 py-2 text-slate-700">{ev.NumPax ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{ev.Ubicacio}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {format(new Date(ev.DataInici), 'dd/MM', { locale: ca })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditableTable({
  rows,
  edited,
  setEdited,
  isManager,
  loading,
}: {
  rows: any[]
  edited: EditedMap
  setEdited: React.Dispatch<React.SetStateAction<EditedMap>>
  isManager: boolean
  loading: boolean
}) {
  return (
    <div className="overflow-x-auto scroll-smooth">
      <table className="min-w-full sm:min-w-[560px] text-[10px] sm:text-xs border-collapse w-full">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 bg-white sticky left-0 shadow-sm z-30">Data preparació</th>
            <th className="p-2">Hora preparació</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Pax</th>
            <th className="p-2">Ubicació</th>
            <th className="p-2">Data esdeveniment</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-6">
                Carregant dades...
              </td>
            </tr>
          ) : rows.length > 0 ? (
            rows.map((ev, idx) => {
              const prepDM = edited[ev.id]?.PreparacioData ?? fmtDM(ev.PreparacioData || '')
              const prepH = edited[ev.id]?.PreparacioHora ?? (ev.PreparacioHora || '')

              return (
                <tr
                  key={`row-${idx}`}
                  className="border-t align-top hover:bg-gray-50 transition-colors text-left"
                >
                  <td className="p-2 bg-white sticky left-0 border-r shadow-sm font-medium">
                    {isManager ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/MM"
                        pattern="\d{1,2}/\d{1,2}"
                        value={prepDM}
                        onChange={(e) => {
                          const v = e.target.value
                          setEdited((prev) => ({
                            ...prev,
                            [ev.id]: { ...prev[ev.id], PreparacioData: v },
                          }))
                        }}
                        className="border rounded p-1 w-full text-xs"
                      />
                    ) : (
                      <span>{prepDM || '-'}</span>
                    )}
                  </td>

                  <td className="p-2">
                    {isManager ? (
                      <input
                        type="time"
                        value={prepH}
                        onChange={(e) => {
                          const v = e.target.value
                          setEdited((prev) => ({
                            ...prev,
                            [ev.id]: { ...prev[ev.id], PreparacioHora: v },
                          }))
                        }}
                        className="border rounded p-1 w-full text-xs"
                      />
                    ) : (
                      <span>{prepH || '-'}</span>
                    )}
                  </td>

                  <td className="p-2">{ev.NomEvent}</td>
                  <td className="p-2">{ev.NumPax ?? '-'}</td>
                  <td className="p-2">{ev.Ubicacio}</td>
                  <td className="p-2">
                    {format(new Date(ev.DataInici), 'dd/MM', { locale: ca })}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-6">
                No hi ha dades disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
