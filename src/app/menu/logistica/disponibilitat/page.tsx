'use client'

import React, { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { Clock, Filter, MapPin, RefreshCw } from 'lucide-react'

import ModuleHeader from '@/components/layout/ModuleHeader'
import { Button } from '@/components/ui/button'
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
    throw new Error(txt || 'No s\'ha pogut carregar la disponibilitat')
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
      setAssignError(e?.message || "Error creant assignació")
    } finally {
      setAssignLoading(false)
    }
  }

  const canAssign = Boolean(selectedVehicle && destination.trim() && conductorId)
  const loading = isLoading
  const listEmpty = !loading && !error && filteredVehicles.length === 0

  return (
    <main className="space-y-6 px-4 pb-12">
      <ModuleHeader
        icon="🚚"
        title="Disponibilitat de vehicles"
        subtitle="Consulta vehicles lliures i crea torns de transport"
      />

      <section className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        {/* Filtres */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4 h-fit">
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
              className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-4 w-4" /> Inici
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-4 w-4" /> Fi
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Tipus de vehicle</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-slate-50"
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
            <div className="text-sm text-slate-600 flex items-center gap-2">
              <span className="text-emerald-700 font-semibold">{availableCount}</span>
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
        <div className="rounded-2xl border bg-white p-4 shadow-sm grid grid-cols-1 2xl:grid-cols-[2fr_1fr] gap-4 h-[calc(90vh-200px)] overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 space-y-3">
            {loading && <div className="text-sm text-slate-500 py-6">Carregant disponibilitat…</div>}
            {error && (
              <div className="text-sm text-red-600 py-6">
                Error: {String(error)}
              </div>
            )}

            {listEmpty && (
              <div className="text-sm text-slate-500 py-6 text-center">
                No hi ha vehicles per als filtres seleccionats.
              </div>
            )}

            {!loading && !error && filteredVehicles.map(v => (
              <div
                key={v.id}
                className={cn(
                  'border rounded-xl px-3 py-2 flex items-center justify-between bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.25)] transition hover:-translate-y-[1px]',
                  selectedVehicle?.id === v.id && 'ring-2 ring-emerald-500'
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">{v.plate}</span>
                    <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 border">
                      {v.type || 'Sense tipus'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {v.type || 'Sense tipus'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-semibold',
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

          <div className="border rounded-xl p-4 bg-slate-50 shadow-inner space-y-3 h-full overflow-y-auto">
            {!selectedVehicle && (
              <div className="text-sm text-slate-500 text-center py-8">
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
                    <div className="text-xs text-slate-500 mt-1">
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
                      className="w-full border rounded px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Hora fi</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Destinació</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="On va el vehicle?"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Conductor</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                    value={conductorId}
                    onChange={(e) => setConductorId(e.target.value)}
                  >
                    <option value="">Selecciona conductor</option>
                    {conductors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
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
                  className="w-full h-11 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:border disabled:border-slate-300 shadow-md"
                  variant="default"
                  size="lg"
                  onClick={handleAssign}
                  disabled={assignLoading || !canAssign}
                >
                  {assignLoading ? 'Assignant…' : 'Crear torn de transport'}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
