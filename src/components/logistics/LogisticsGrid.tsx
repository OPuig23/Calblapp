// ✅ file: src/components/logistics/LogisticsGrid.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ca } from 'date-fns/locale'
import { useLogisticsData } from '@/hooks/useLogisticsData'
import { useSession } from 'next-auth/react'
import { RefreshCcw } from 'lucide-react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'

type EditedMap = Record<string, { PreparacioData?: string; PreparacioHora?: string }>

function parseDM(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(value?.trim() || '')
  if (!m) return null
  const d = Number(m[1]), mm = Number(m[2])
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

  // 🧭 Rang de dates del SmartFilter
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  const handleFilterChange = (f: SmartFiltersChange) => {
    if (f.start && f.end) setDateRange({ start: f.start, end: f.end })
  }

  const { events, refresh, weekOffset, setWeekOffset, currentWeek, loading } = useLogisticsData(dateRange)
  const [updating, setUpdating] = useState(false)
  const [edited, setEdited] = useState<EditedMap>({})
  const [rows, setRows] = useState(events)

  // 🔹 Ordenació automàtica quan arriben noves dades
  useEffect(() => {
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => {
        const aHas = !!(a.PreparacioData && a.PreparacioHora)
        const bHas = !!(b.PreparacioData && b.PreparacioHora)
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        if (!aHas && !bHas)
          return new Date(a.DataInici).getTime() - new Date(b.DataInici).getTime()
        const d1 = new Date(`${a.PreparacioData}T${a.PreparacioHora || '00:00'}`).getTime()
        const d2 = new Date(`${b.PreparacioData}T${b.PreparacioHora || '00:00'}`).getTime()
        return d1 - d2
      })
      setRows(sorted)
    } else {
      setRows([])
    }
  }, [events])

  const handleRefresh = async () => {
    setUpdating(true)
    await refresh()
    setUpdating(false)
  }

  const handleConfirm = async () => {
    setUpdating(true)

    const ids = Object.keys(edited)
    for (const id of ids) {
      const original = rows.find((r) => r.id === id)
      const payload: { id: string; PreparacioData?: string; PreparacioHora?: string } = { id }

      if (edited[id]?.PreparacioData) {
        const year = original ? new Date(original.DataInici).getFullYear() : new Date().getFullYear()
        payload.PreparacioData = toISOFromDM(edited[id].PreparacioData!, year)
      }
      if (edited[id]?.PreparacioHora) payload.PreparacioHora = edited[id].PreparacioHora!

      await fetch('/api/logistics/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    await refresh()

    setTimeout(() => {
      const sorted = [...events].sort((a, b) => {
        const aHas = !!(a.PreparacioData && a.PreparacioHora)
        const bHas = !!(b.PreparacioData && b.PreparacioHora)
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        const d1 = new Date(`${a.PreparacioData}T${a.PreparacioHora || '00:00'}`).getTime()
        const d2 = new Date(`${b.PreparacioData}T${b.PreparacioHora || '00:00'}`).getTime()
        return d1 - d2
      })
      setRows(sorted)
    }, 300)

    setEdited({})
    setUpdating(false)
  }

  return (
    <div className="mt-4 w-full bg-white border rounded-xl shadow-sm overflow-hidden">
     
      {/* 🔹 SmartFilter: control de dates centralitzat */}
    
      <div className="px-4 py-3 border-b bg-gray-50">
        <SmartFilters
          showStatus={false}
          role="Direcció"
          modeDefault="week"
          onChange={handleFilterChange}
        />
      </div>

      {/* 🔹 Taula principal */}
      <div className="overflow-x-auto scroll-smooth">
        <table className="min-w-max text-[10px] sm:text-xs border-collapse w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 bg-white sticky left-0 shadow-sm z-30">Data esdeveniment</th>
              <th className="p-2">Nom</th>
              <th className="p-2">Pax</th>
              <th className="p-2">Ubicació</th>
              <th className="p-2">Data preparació</th>
              <th className="p-2">Hora preparació</th>
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
                      {format(new Date(ev.DataInici), 'dd/MM', { locale: ca })}
                    </td>
                    <td className="p-2">{ev.NomEvent}</td>
                    <td className="p-2">{ev.NumPax ?? '-'}</td>
                    <td className="p-2">{ev.Ubicacio}</td>
                    <td className="p-2">
                      {(role === 'cap' || role === 'admin' || role === 'direccio') ? (
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
                      {(role === 'cap' || role === 'admin' || role === 'direccio') ? (
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

      {/* 🔹 Peu amb botó confirmar */}
      {(role === 'cap' || role === 'admin' || role === 'direccio') && (
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
            {updating ? 'Guardant…' : 'Confirmar ordre'}
          </button>
        </div>
      )}
    </div>
  )
}
