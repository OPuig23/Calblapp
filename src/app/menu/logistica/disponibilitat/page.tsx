'use client'

import React, { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Clock, Filter, MapPin, RefreshCw, Truck, MoreVertical } from 'lucide-react'
import * as XLSX from 'xlsx'

import ModuleHeader from '@/components/layout/ModuleHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type VehicleAvailability = {
  id: string
  plate: string
  type: string
  available: boolean
}

type Conductor = {
  id: string
  name: string
}

type AvailabilityResponse = {
  vehicles: VehicleAvailability[]
}

const availabilityFetcher = async (
  [_key, date, start, end]: [string, string, string, string],
) => {
  const res = await fetch('/api/transports/available', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: date,
      endDate: date,
      startTime: start,
      endTime: end,
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || "No s'ha pogut carregar la disponibilitat")
  }

  return (await res.json()) as AvailabilityResponse
}

export default function DisponibilitatLogisticaPage() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('23:59')
  const [typeFilter, setTypeFilter] = useState<string>('tots')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAvailability | null>(null)
  const [destination, setDestination] = useState('')
  const [notes, setNotes] = useState('')
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [conductorId, setConductorId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [showMobileParams, setShowMobileParams] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(
    ['availability', date, startTime, endTime],
    availabilityFetcher,
    { revalidateOnFocus: false },
  )

  const vehicles = data?.vehicles ?? []

  const allTypes = useMemo(() => {
    const set = new Set<string>()
    vehicles.forEach(v => v.type && set.add(v.type))
    return Array.from(set)
  }, [vehicles])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (onlyAvailable && !v.available) return false
      if (typeFilter !== 'tots' && v.type !== typeFilter) return false
      return true
    })
  }, [vehicles, typeFilter, onlyAvailable])

  const availableCount = filteredVehicles.filter(v => v.available).length

  // Carregar conductors disponibles quan hi ha vehicle seleccionat i franja
  useEffect(() => {
    if (!selectedVehicle || !date || !startTime || !endTime) {
      setConductors([])
      return
    }

    const controller = new AbortController()
    const load = async () => {
      try {
        const params = new URLSearchParams({
          department: 'logistica',
          startDate: date,
          startTime,
          endDate: date,
          endTime,
        })
        const res = await fetch(`/api/personnel/available?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) {
          setConductors([])
          return
        }
        const data = await res.json()
        setConductors(Array.isArray(data?.conductors) ? data.conductors : [])
      } catch {
        if (!controller.signal.aborted) setConductors([])
      }
    }

    load()
    return () => controller.abort()
  }, [selectedVehicle, date, startTime, endTime])

  const handleAssign = async () => {
    if (!selectedVehicle) return
    if (!destination.trim() || !conductorId) {
      setAssignError('La destinació i el conductor són obligatoris.')
      return
    }
    setAssignError(null)
    try {
      setAssignLoading(true)
      const selectedConductor = conductors.find(c => c.id === conductorId)

      const payload = {
        plate: selectedVehicle.plate,
        vehicleId: selectedVehicle.id,
        vehicleType: selectedVehicle.type,
        conductorId,
        conductorName: selectedConductor?.name || '',
        startDate: date,
        endDate: date,
        startTime,
        endTime,
        destination: destination.trim(),
        notes,
        department: 'logistica',
      }

      const res = await fetch('/api/transports/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || "No s'ha pogut crear l'assignació")
      }

      setSelectedVehicle(null)
      setDestination('')
      setNotes('')
      setConductorId('')
      mutate()
    } catch (e: any) {
      setAssignError(e?.message || 'Error creant assignació')
    } finally {
      setAssignLoading(false)
    }
  }

  const canAssign = Boolean(selectedVehicle && destination.trim() && conductorId)
  const loading = isLoading
  const listEmpty = !loading && !error && filteredVehicles.length === 0

  const exportBase = `disponibilitat-logistica-${date}-${startTime.replace(
    ':',
    ''
  )}-${endTime.replace(':', '')}`

  const exportRows = useMemo(
    () =>
      filteredVehicles.map((v) => ({
        Data: date,
        HoraInici: startTime,
        HoraFi: endTime,
        Matricula: v.plate || '',
        Tipus: v.type || '',
        Disponible: v.available ? 'Si' : 'No',
      })),
    [filteredVehicles, date, startTime, endTime]
  )

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Disponibilitat')
    XLSX.writeFile(wb, `${exportBase}.xlsx`)
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const buildPdfTableHtml = () => {
    const cols = [
      'Data',
      'HoraInici',
      'HoraFi',
      'Matricula',
      'Tipus',
      'Disponible',
    ]

    const header = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
    const body = exportRows
      .map((row) => {
        const cells = cols
          .map((key) => `<td>${escapeHtml(String((row as any)[key] ?? ''))}</td>`)
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(exportBase)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 16px; margin-bottom: 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>Disponibilitat de vehicles</h1>
    <div class="meta">Franja: ${escapeHtml(date)} ${escapeHtml(
      startTime
    )} - ${escapeHtml(endTime)}</div>
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`
  }

  const handleExportPdfTable = () => {
    const html = buildPdfTableHtml()
    const win = window.open('', '_blank', 'width=1200,height=900')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const handleExportPdfView = () => {
    window.print()
  }

  const parseTime = (value?: string) => {
    if (!value) return null
    const [h, m] = value.split(':')
    const hh = Number(h)
    const mm = Number(m)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
    return hh * 60 + mm
  }

  const overlapsMinutes = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
    aStart < bEnd && bStart < aEnd

  const loadAssignmentRows = async () => {
    const res = await fetch(`/api/transports/assign?date=${date}`)
    if (!res.ok) {
      throw new Error('No s ha pogut carregar assignacions')
    }
    const data = await res.json()
    const assignments = Array.isArray(data?.assignments) ? data.assignments : []

    const rangeStart = parseTime(startTime)
    const rangeEnd = parseTime(endTime)
    const hasRange = rangeStart != null && rangeEnd != null && rangeEnd > rangeStart

    const filtered = assignments.filter((a: any) => {
      if (selectedVehicle?.plate && a?.plate !== selectedVehicle.plate) return false

      const startDate = String(a?.startDate || '')
      const endDate = String(a?.endDate || a?.startDate || '')
      if (startDate && endDate) {
        if (date < startDate || date > endDate) return false
      }

      if (hasRange) {
        const aStart = parseTime(a?.startTime) ?? rangeStart
        const aEnd = parseTime(a?.endTime) ?? rangeEnd
        if (aStart == null || aEnd == null) return false
        if (!overlapsMinutes(rangeStart!, rangeEnd!, aStart, aEnd)) return false
      }

      return true
    })

    return filtered.map((a: any) => ({
      Data: a?.startDate || date,
      HoraInici: a?.startTime || '',
      HoraFi: a?.endTime || '',
      Matricula: a?.plate || '',
      Vehicle: a?.vehicleType || '',
      Conductor: a?.conductorName || '',
      Destinacio: a?.destination || '',
      Notes: a?.notes || '',
      Estat: a?.status || '',
    }))
  }

  const handleExportAssignmentsExcel = async () => {
    try {
      const rows = await loadAssignmentRows()
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Assignacions')
      XLSX.writeFile(wb, `${exportBase}-assignacions.xlsx`)
    } catch (err) {
      console.error(err)
      alert('No s ha pogut exportar les assignacions.')
    }
  }

  const handleExportAssignmentsPdf = async () => {
    try {
      const rows = await loadAssignmentRows()
      const cols = [
        'Data',
        'HoraInici',
        'HoraFi',
        'Matricula',
        'Vehicle',
        'Conductor',
        'Destinacio',
        'Notes',
        'Estat',
      ]
      const header = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
      const body = rows
        .map((row: any) => {
          const cells = cols
            .map((key) => `<td>${escapeHtml(String(row?.[key] ?? ''))}</td>`)
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(exportBase)}-assignacions</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 16px; margin-bottom: 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>Assignacions de transport</h1>
    <div class="meta">Franja: ${escapeHtml(date)} ${escapeHtml(
      startTime
    )} - ${escapeHtml(endTime)}</div>
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`

      const win = window.open('', '_blank', 'width=1200,height=900')
      if (!win) return
      win.document.open()
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 300)
    } catch (err) {
      console.error(err)
      alert('No s ha pogut exportar les assignacions.')
    }
  }

  return (
    <main className="space-y-6 px-4 pb-12">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #disponibilitat-print-root, #disponibilitat-print-root * { visibility: visible; }
          #disponibilitat-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <ModuleHeader
        icon={<Truck className="h-6 w-6 text-emerald-600" />}
        title="Disponibilitat de vehicles"
        subtitle="Consulta vehicles lliures i crea torns de transport"
      />

            {/* Botó per mostrar/ocultar paràmetres en mòbil */}
      <div className="flex items-center justify-between gap-2">
        <div className="md:hidden flex-1">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowMobileParams((v) => !v)}
          >
            <span>Paràmetres</span>
            <Filter className={`h-4 w-4 transition-transform ${showMobileParams ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Exportar">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdfView}>
                PDF (vista)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdfTable}>
                PDF (taula)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAssignmentsExcel}>
                Excel (assignacions)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAssignmentsPdf}>
                PDF (assignacions)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden md:flex ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdfView}>
                PDF (vista)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdfTable}>
                PDF (taula)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAssignmentsExcel}>
                Excel (assignacions)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportAssignmentsPdf}>
                PDF (assignacions)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <section
        id="disponibilitat-print-root"
        className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]"
      >
        {/* Paràmetres */}
        <div
          className={cn(
            'h-fit space-y-4 rounded-2xl border bg-white p-4 shadow-sm',
            showMobileParams ? 'block' : 'hidden',
            'md:block'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-slate-500" />
            Paràmetres
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Dia</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-4 w-4" /> Inici
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-4 w-4" /> Fi
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Tipus de vehicle</label>
            <select
              className="w-full rounded-md border bg-slate-50 px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="tots">Tots els tipus</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant={onlyAvailable ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOnlyAvailable(v => !v)}
            >
              {onlyAvailable ? 'Només disponibles' : 'Mostrar-ho tot'}
            </Button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-emerald-700">{availableCount}</span>
              <span className="text-slate-400">/</span>
              <span>{filteredVehicles.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="h-3.5 w-3.5" />
            Les ocupacions inclouen quadrants de tots els departaments i assignacions de transports.
          </div>
        </div>

        {/* Llista + panell assignació */}
        <div className="grid h-[calc(90vh-200px)] grid-cols-1 gap-4 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm 2xl:grid-cols-[2fr_1fr]">
          <div className="h-full space-y-3 overflow-y-auto pr-1">
            {loading && <div className="py-6 text-sm text-slate-500">Carregant disponibilitat...</div>}
            {error && (
              <div className="py-6 text-sm text-red-600">
                Error: {String(error)}
              </div>
            )}

            {listEmpty && (
              <div className="py-6 text-center text-sm text-slate-500">
                No hi ha vehicles per als filtres seleccionats.
              </div>
            )}

            {!loading && !error && filteredVehicles.map(v => (
              <div
                key={v.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border bg-white px-3 py-2 shadow-[0_4px_14px_-8px_rgba(15,23,42,0.25)] transition hover:-translate-y-[1px]',
                  selectedVehicle?.id === v.id && 'ring-2 ring-emerald-500'
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">{v.plate}</span>
                    <span className="rounded-full border bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                      {v.type || 'Sense tipus'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {v.type || 'Sense tipus'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-semibold',
                    v.available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  )}>
                    {v.available ? 'Disponible' : 'Ocupat'}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedVehicle(v)}
                    disabled={!v.available}
                  >
                    Assigna
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="h-full space-y-3 overflow-y-auto rounded-xl border bg-slate-50 p-4 shadow-inner">
            {!selectedVehicle && (
              <div className="py-8 text-center text-sm text-slate-500">
                Selecciona un vehicle disponible per crear un torn de transport.
              </div>
            )}

            {selectedVehicle && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Vehicle seleccionat</div>
                    <div className="font-semibold text-slate-900">{selectedVehicle.plate}</div>
                    <div className="text-xs text-slate-500">{selectedVehicle.type || 'Sense tipus'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {format(new Date(date), "d 'de' LLLL yyyy")} · {startTime} - {endTime}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(null)}>
                    Cancel·la
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Hora inici</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded border bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Hora fi</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded border bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Destinació</label>
                  <input
                    type="text"
                    className="w-full rounded border bg-white px-3 py-2 text-sm"
                    placeholder="On va el vehicle?"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Conductor</label>
                  <select
                    className="w-full rounded border bg-white px-3 py-2 text-sm"
                    value={conductorId}
                    onChange={(e) => setConductorId(e.target.value)}
                  >
                    <option value="">Selecciona conductor</option>
                    {conductors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {conductors.length === 0 && (
                    <div className="text-xs text-amber-600">
                      No hi ha conductors disponibles en aquesta franja.
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Notes (opcional)</label>
                  <textarea
                    className="w-full rounded border bg-white px-3 py-2 text-sm"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Indicacions, contacte, etc."
                  />
                </div>

                {assignError && (
                  <div className="text-xs text-rose-600">{assignError}</div>
                )}

                <Button
                  className="h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white shadow-md hover:bg-emerald-700 disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                  variant="default"
                  size="lg"
                  onClick={handleAssign}
                  disabled={assignLoading || !canAssign}
                >
                  {assignLoading ? 'Assignant...' : 'Crear torn de transport'}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

