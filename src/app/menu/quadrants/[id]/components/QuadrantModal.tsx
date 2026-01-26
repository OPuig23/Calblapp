// File: src/app/menu/quadrants/[id]/components/QuadrantModal.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAvailablePersonnel } from '../hooks/useAvailablePersonnel'

import QuadrantFieldsServeis from './QuadrantFieldsServeis'
import QuadrantFieldsLogistica from './QuadrantFieldsLogistica'

interface QuadrantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
event: {
  id: string
  summary?: string
  title?: string
  start: string
  startTime?: string
  endTime?: string
  location?: string
  eventLocation?: string
  totalWorkers?: number
  numDrivers?: number
  meetingPoint?: string

  // 🔵 AFEGIT
  service?: string
  numPax?: number
  commercial?: string
}
}

type AvailableVehicle = {
  id: string
  plate?: string
  type?: string
  available: boolean
  conductorId?: string | null
}

// Helpers
const extractDate = (iso = '') => iso.split('T')[0] || ''

const parseEventCode = (title = ''): string => {
  const t = String(title || '')
  const mHash = t.match(/#\s*([A-Z]{1,2}\d{5,})\b/i)
  if (mHash) return mHash[1].toUpperCase()
  const all = [...t.matchAll(/\b([A-Z]{1,2}\d{5,})\b/gi)]
  if (all.length) return all[all.length - 1][1].toUpperCase()
  return ''
}

const splitTitle = (title = '') => {
  const code = parseEventCode(title)
  let name = title
  if (code) {
    name = name.replace(new RegExp(`([\\-–—#]\\s*)?${code}\\s*$`, 'i'), '').trim()
  }
  return { name: name.trim(), code }
}

export default function QuadrantModal({ open, onOpenChange, event }: QuadrantModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const department =
    (
      session?.user?.department ||
      (session as any)?.department ||
      (session as any)?.dept ||
      'serveis'
    )
      .toString()
      .toLowerCase()
  const isCuina = department === 'cuina'

  const rawTitle = event.summary || event.title || ''
  const { name: eventName, code: parsedCode } = splitTitle(rawTitle)
  const eventCode = parsedCode || (rawTitle.match(/[A-Z]\d{6,}/)?.[0] ?? '').toUpperCase()
  const [startDate, setStartDate]       = useState(extractDate(event.start))
  const [endDate, setEndDate]           = useState(extractDate(event.start))
  const [startTime, setStartTime]       = useState(event.startTime || '')
  const [endTime, setEndTime]           = useState(event.endTime || '')
  const [arrivalTime, setArrivalTime]   = useState(event.arrivalTime || '')
  const [location, setLocation]         = useState(event.location || event.eventLocation || '')
  const [meetingPoint, setMeetingPoint] = useState(event.meetingPoint || '')
  const [manualResp, setManualResp]     = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)

  const [totalWorkers, setTotalWorkers] = useState(event.totalWorkers?.toString() || '')
  const [numDrivers, setNumDrivers]     = useState(event.numDrivers?.toString() || '')
  const [available, setAvailable]       = useState<{ vehicles: AvailableVehicle[] }>({ vehicles: [] })
  const [vehicleAssignments, setVehicleAssignments] = useState<
    { vehicleType: string; vehicleId: string; plate: string; arrivalTime?: string }[]
  >([])

  const [serveisData, setServeisData] = useState({
    workers: Number(event.totalWorkers || 0),
    drivers: Number(event.numDrivers || 0),
    brigades: [] as { id: string; name: string; workers: number; startTime: string; endTime: string }[],
  })

  type CuinaGroup = {
    id: string
    meetingPoint: string
    startTime: string
    arrivalTime: string
    endTime: string
    workers: number
    drivers: number
    responsibleId: string
  }

  const makeGroupId = () => `group-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createGroup = (seed: Partial<CuinaGroup> = {}): CuinaGroup => ({
    id: seed.id || makeGroupId(),
    meetingPoint: seed.meetingPoint ?? meetingPoint ?? '',
    startTime: seed.startTime ?? startTime ?? '',
    arrivalTime: seed.arrivalTime ?? arrivalTime ?? '',
    endTime: seed.endTime ?? endTime ?? '',
    workers: (seed.workers ?? Number(totalWorkers)) || 0,
    drivers: (seed.drivers ?? Number(numDrivers)) || 0,
    responsibleId: seed.responsibleId ?? '',
  })

  const [cuinaGroups, setCuinaGroups] = useState<CuinaGroup[]>(() => [createGroup()])
  const cuinaTotalsRef = useRef({
    workers: Number(totalWorkers) || 0,
    drivers: Number(numDrivers) || 0,
  })

  const cuinaTotals = useMemo(
    () => ({
      workers: cuinaGroups.reduce((sum, group) => sum + group.workers, 0),
      drivers: cuinaGroups.reduce((sum, group) => sum + group.drivers, 0),
      responsables: cuinaGroups.length,
    }),
    [cuinaGroups]
  )

  useEffect(() => {
    if (!isCuina) return
    const targetWorkers = Number(totalWorkers) || 0
    const targetDrivers = Number(numDrivers) || 0
    setCuinaGroups((prev) => {
      if (!prev.length) {
        return [
          {
            id: makeGroupId(),
            meetingPoint: meetingPoint || '',
            startTime: startTime || '',
            arrivalTime: arrivalTime || '',
            endTime: endTime || '',
            workers: targetWorkers,
            drivers: targetDrivers,
          },
        ]
      }
      const first = prev[0]
      const shouldSync =
        prev.length === 1 &&
        first.workers === cuinaTotalsRef.current.workers &&
        first.drivers === cuinaTotalsRef.current.drivers
      if (!shouldSync) return prev
      return [{ ...first, workers: targetWorkers, drivers: targetDrivers }, ...prev.slice(1)]
    })
    cuinaTotalsRef.current = { workers: targetWorkers, drivers: targetDrivers }
  }, [isCuina, totalWorkers, numDrivers, meetingPoint, startTime, arrivalTime, endTime])

  useEffect(() => {
    if (!isCuina) return
    const firstPoint = cuinaGroups[0]?.meetingPoint || ''
    if (firstPoint !== meetingPoint) {
      setMeetingPoint(firstPoint)
    }
  }, [cuinaGroups, isCuina, meetingPoint])

  useEffect(() => {
    if (!isCuina) return
    const firstGroup = cuinaGroups[0]
    if (!firstGroup) return
    if (firstGroup.startTime !== startTime) setStartTime(firstGroup.startTime)
    if (firstGroup.endTime !== endTime) setEndTime(firstGroup.endTime)
    if (firstGroup.arrivalTime !== arrivalTime) setArrivalTime(firstGroup.arrivalTime)
  }, [cuinaGroups, isCuina, startTime, endTime, arrivalTime])

  const updateCuinaGroup = (id: string, patch: Partial<CuinaGroup>) => {
    setCuinaGroups((prev) =>
      prev.map((group) => (group.id === id ? { ...group, ...patch } : group))
    )
  }

  const addCuinaGroup = () => {
    setCuinaGroups((prev) => [...prev, createGroup({ workers: 0, drivers: 0 })])
  }

  const removeCuinaGroup = (id: string) => {
    setCuinaGroups((prev) => {
      const next = prev.filter((group) => group.id !== id)
      return next.length ? next : [createGroup()]
    })
  }

  useEffect(() => {
    setStartDate(extractDate(event.start))
    setEndDate(extractDate(event.start))
    setStartTime(event.startTime || '')
    setEndTime(event.endTime || '')
    setArrivalTime(event.arrivalTime || '')
    setLocation(event.location || event.eventLocation || '')
    setMeetingPoint(event.meetingPoint || '')
    setManualResp('')
    setError(null)
    setSuccess(false)
    setAvailable({ vehicles: [] })
    setVehicleAssignments([])
    setTotalWorkers(event.totalWorkers?.toString() || '')
    setNumDrivers(event.numDrivers?.toString() || '')
    setServeisData({
      workers: Number(event.totalWorkers || 0),
      drivers: Number(event.numDrivers || 0),
      brigades: [],
    })
    const initialWorkers = Number(event.totalWorkers || 0)
    const initialDrivers = Number(event.numDrivers || 0)
    cuinaTotalsRef.current = { workers: initialWorkers, drivers: initialDrivers }
    setCuinaGroups([createGroup({ workers: initialWorkers, drivers: initialDrivers })])
  }, [event, open])

  const { responsables, loading: availLoading } = useAvailablePersonnel({
    departament: department,
    startDate,
    endDate,
    startTime,
    endTime,
  })

  useEffect(() => {
    if (
      (department.toLowerCase() === 'logistica' || department.toLowerCase() === 'cuina') &&
      startDate && startTime && endDate && endTime && totalWorkers !== ''
    ) {
      fetch('/api/transports/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, startTime, endDate, endTime, department }),
      })
        .then(async (r) => {
          const text = await r.text()
          if (!text) return { vehicles: [] }
          try {
            const parsed = JSON.parse(text)
            return { vehicles: parsed.vehicles || [] }
          } catch {
            return { vehicles: [] }
          }
        })
        .then((data) => setAvailable(data))
        .catch(() => setAvailable({ vehicles: [] }))
    }
  }, [department, startDate, startTime, endDate, endTime, totalWorkers])

  useEffect(() => {
    setVehicleAssignments((prev) =>
      Array.from({ length: Number(numDrivers || 0) }).map((_, idx) => ({
        vehicleType: prev[idx]?.vehicleType || '',
        vehicleId: prev[idx]?.vehicleId || '',
        plate: prev[idx]?.plate || '',
        arrivalTime: prev[idx]?.arrivalTime || '',
      }))
    )
  }, [numDrivers])

  const canAutoGen = Boolean(startDate) && Boolean(endDate) && Boolean(startTime) && Boolean(endTime)

  const handleAutoGenAndSave = async () => {
    if (!canAutoGen) return
    setLoading(true); setError(null); setSuccess(false)

    try {
      const payload: Record<string, unknown> = {
        eventId: event.id,
        code: eventCode,
        eventName,
        department,
        location,
        meetingPoint,
        startDate,
        startTime,
        endDate,
        endTime,
        arrivalTime: arrivalTime || null,
        manualResponsibleId: isCuina ? null : manualResp || null,
        service: event.service || null,
        numPax: event.numPax || null,
        commercial: event.commercial || null,
      }

      if (isCuina) {
        const groupsPayload = cuinaGroups.map((group) => {
          const selected = responsables.find((r) => r.id === group.responsibleId)
          return {
          meetingPoint: group.meetingPoint || meetingPoint || '',
          startTime: group.startTime,
          arrivalTime: group.arrivalTime || null,
          endTime: group.endTime,
          workers: group.workers,
          drivers: group.drivers,
          responsibleId: group.responsibleId && group.responsibleId !== '__auto__'
            ? group.responsibleId
            : null,
          responsibleName: selected?.name || null,
          }
        })

        payload.groups = groupsPayload
        payload.totalWorkers = cuinaTotals.workers
        payload.numDrivers = cuinaTotals.drivers
        payload.cuinaGroupCount = cuinaGroups.length

      } else if (department.toLowerCase() === 'serveis') {
        payload.totalWorkers = serveisData.workers
        payload.numDrivers   = serveisData.drivers
        payload.brigades     = serveisData.brigades
        payload.service = event.service || null     
        payload.numPax = event.numPax || null
        payload.commercial = event.commercial || null

      } else {
        const canonicalType = (t?: string) => {
          const x = (t || '').trim()
          if (!x) return ''
          const hit = (available?.vehicles || []).find(av => av.type?.toLowerCase() === x.toLowerCase())
          return hit?.type || x
        }
        const vehiclesPayload = Array.from({ length: Number(numDrivers || 0) }).map((_, idx) => {
          const v = vehicleAssignments[idx] ?? { vehicleType: '', vehicleId: '', plate: '', arrivalTime: '' }
          if (v.vehicleId) {
            const match = available.vehicles.find(av => av.id === v.vehicleId)
            return {
              id: v.vehicleId,
              plate: match?.plate || '',
              vehicleType: v.vehicleType || match?.type || '',
              conductorId: match?.conductorId || null,
              arrivalTime: v.arrivalTime || '',
            }
          }
          if (v.vehicleType) {
            return {
              id: '',
              plate: '',
              vehicleType: canonicalType(v.vehicleType),
              conductorId: null,
              arrivalTime: v.arrivalTime || '',
            }
          }
          return { id: '', plate: '', vehicleType: '', conductorId: null, arrivalTime: '' }
        })
        payload.totalWorkers = Number(totalWorkers)
        payload.numDrivers   = Number(numDrivers)
        payload.vehicles     = vehiclesPayload
      }

      const res = await fetch('/api/quadrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      const data = JSON.parse(text)

      if (!res.ok || (data as any)?.ok === false) {
        throw new Error((data as any)?.error || 'Error desant el quadrant')
      }

      setSuccess(true)
      toast.success('Borrador creat correctament!')
      // 🧩 Notificació d'actualització immediata
window.dispatchEvent(new CustomEvent('quadrant:created', { detail: { status: 'draft' } }))
onOpenChange(false)

    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      toast.error(error.message)
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
  className="max-w-md w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto rounded-2xl p-4"
  onClick={(e) => e.stopPropagation()}
>

        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{eventName}</DialogTitle>
          <DialogDescription>
            Servei {event.service || '—'} · PAX {event.numPax ?? '—'} · Hora inici{' '}
            {event.startTime || startTime || '—:—'}
            {location ? ` · Ubicació ${location}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Inici</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {!isCuina && (
              <div>
                <Label>Hora Inici</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            )}
            {!isCuina && (
              <div>
                <Label>Hora arribada (esdeveniment)</Label>
                <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </div>
            )}
            {!isCuina && (
              <div>
                <Label>Hora Fi</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
          </div>

          {/* Camps específics */}
          {department.toLowerCase() === 'serveis' && (
            <QuadrantFieldsServeis value={serveisData} onChange={setServeisData} />
          )}
          {department.toLowerCase() === 'logistica' && (
            <QuadrantFieldsLogistica
              totalWorkers={totalWorkers}
              numDrivers={numDrivers}
              setTotalWorkers={setTotalWorkers}
              setNumDrivers={setNumDrivers}
              vehicleAssignments={vehicleAssignments}
              setVehicleAssignments={setVehicleAssignments}
              available={available}
            />
          )}

          {/* Meeting point */}
          {!isCuina && (
            <div>
              <Label>Lloc de concentració</Label>
              <Input
                type="text"
                placeholder="Ex: Pàrquing camions"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
              />
            </div>
          )}

          {isCuina && (
            <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Número total de treballadors</Label>
                    <Input
                      type="number"
                      min={0}
                      value={totalWorkers}
                      onChange={(e) => setTotalWorkers(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suma per grups: {cuinaTotals.workers}
                    </p>
                  </div>
                  <div>
                    <Label>Número total de conductors</Label>
                    <Input
                      type="number"
                      min={0}
                      value={numDrivers}
                      onChange={(e) => setNumDrivers(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suma per grups: {cuinaTotals.drivers}
                    </p>
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Grups Cuina</p>
                    <p className="text-xs text-slate-500">
                      Treballadors {cuinaTotals.workers} · Conductors {cuinaTotals.drivers} ·
                      Responsables {cuinaTotals.responsables}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={addCuinaGroup}
                  >
                    + Grup
                  </Button>
                </div>
                <div className="space-y-3">
                  {cuinaGroups.map((group, idx) => (
                    <div
                      key={group.id}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Grup {idx + 1}</span>
                        {cuinaGroups.length > 1 && (
                          <button
                            type="button"
                            className="text-red-500 hover:underline"
                            onClick={() => removeCuinaGroup(group.id)}
                          >
                            Elimina grup
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <Label>Meeting point</Label>
                          <Input
                            value={group.meetingPoint}
                            onChange={(e) =>
                              updateCuinaGroup(group.id, { meetingPoint: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Hora arribada</Label>
                          <Input
                            type="time"
                            value={group.arrivalTime}
                            onChange={(e) =>
                              updateCuinaGroup(group.id, { arrivalTime: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Hora inici</Label>
                          <Input
                            type="time"
                            value={group.startTime}
                            onChange={(e) =>
                              updateCuinaGroup(group.id, { startTime: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Hora fi</Label>
                          <Input
                            type="time"
                            value={group.endTime}
                            onChange={(e) =>
                              updateCuinaGroup(group.id, { endTime: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Treballadors</Label>
                        <Input
                          type="number"
                            min={0}
                            value={group.workers}
                            onChange={(e) => {
                              const value = Number(e.target.value)
                              updateCuinaGroup(group.id, {
                                workers: Number.isNaN(value) ? 0 : value,
                              })
                            }}
                          />
                        </div>
                      <div>
                        <Label>Conductors</Label>
                        <Input
                          type="number"
                          min={0}
                            value={group.drivers}
                            onChange={(e) => {
                              const value = Number(e.target.value)
                              updateCuinaGroup(group.id, {
                                drivers: Number.isNaN(value) ? 0 : value,
                              })
                            }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Responsable</Label>
                      {availLoading ? (
                        <p className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="animate-spin" /> Carregant…
                        </p>
                      ) : (
                        <Select
                          value={group.responsibleId || '__auto__'}
                          onValueChange={(value) =>
                            updateCuinaGroup(group.id, {
                              responsibleId: value === '__auto__' ? '' : value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona un responsable…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto__">— Automàtic —</SelectItem>
                            {responsables.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isCuina && (
            <div>
              <Label>Responsable (manual)</Label>
              {availLoading ? (
                <p className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="animate-spin" /> Carregant…
                </p>
              ) : (
                <Select value={manualResp} onValueChange={setManualResp}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un responsable…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">— Automàtic —</SelectItem>
                    {responsables.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Feedback */}
          <AnimatePresence>
            {error && (
              <motion.div className="text-red-600 flex items-center gap-2 text-sm">
                <AlertTriangle size={18} /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div className="text-green-600 flex items-center gap-2">
                <CheckCircle2 size={20} /> Borrador creat!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            className="bg-blue-600 text-white gap-2"
            onClick={handleAutoGenAndSave}
            disabled={!canAutoGen || loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {loading ? 'Processant…' : 'Auto generar i desa'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel·la</Button>
        </DialogFooter>

        <DialogClose className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
          ×
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
