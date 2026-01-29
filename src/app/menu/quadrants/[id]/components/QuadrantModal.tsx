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
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAvailablePersonnel } from '../hooks/useAvailablePersonnel'

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
  const isServeis = department === 'serveis'
  const isGroupDept = isCuina || isServeis

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
  const prevStartDateRef = useRef(startDate)
  const [ettOpen, setEttOpen] = useState(false)
  const [ettData, setEttData] = useState({
    serviceDate: extractDate(event.start),
    meetingPoint: location,
    startTime,
    endTime,
    workers: '',
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

  type ServeiGroup = {
    id: string
    serviceDate: string
    dateLabel: string
    meetingPoint: string
    startTime: string
    endTime: string
    workers: number
    responsibleId: string
    needsDriver: boolean
    driverId: string
  }

type ServeiGroupSeed = Partial<ServeiGroup> & {
  defaultMeetingPoint?: string
  defaultStartTime?: string
  defaultEndTime?: string
}

type TimetableEntry = {
  startTime?: string
  endTime?: string
}

const normalizeTime = (value?: string) => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const collectTimetable = (entry: TimetableEntry) => {
  const start = normalizeTime(entry.startTime)
  const end = normalizeTime(entry.endTime)
  if (start && end) return { startTime: start, endTime: end }
  return null
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

  const createServeiGroup = (seed: ServeiGroupSeed = {}): ServeiGroup => ({
    id: seed.id || makeGroupId(),
    serviceDate: seed.serviceDate ?? extractDate(event.start),
    dateLabel: seed.dateLabel ?? '',
    meetingPoint:
      seed.meetingPoint ?? seed.defaultMeetingPoint ?? meetingPoint ?? location ?? '',
    startTime: seed.startTime ?? seed.defaultStartTime ?? startTime ?? '',
    endTime: seed.endTime ?? seed.defaultEndTime ?? endTime ?? '',
    workers: seed.workers ?? 0,
    responsibleId: seed.responsibleId ?? '',
    needsDriver: seed.needsDriver ?? false,
    driverId: seed.driverId ?? '',
  })

  const [cuinaGroups, setCuinaGroups] = useState<CuinaGroup[]>(() => [createGroup()])
  const [serveisGroups, setServeisGroups] = useState<ServeiGroup[]>(() => [
    createServeiGroup({
      defaultMeetingPoint: meetingPoint || location || '',
      defaultStartTime: startTime,
      defaultEndTime: endTime,
    }),
  ])
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

  const serveisTotals = useMemo(
    () => ({
      workers: serveisGroups.reduce((sum, group) => sum + group.workers, 0),
      drivers: serveisGroups.filter((group) => group.needsDriver).length,
      responsables: serveisGroups.length,
    }),
    [serveisGroups]
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

  const updateServeisGroup = (id: string, patch: Partial<ServeiGroup>) => {
    setServeisGroups((prev) => prev.map((group) => (group.id === id ? { ...group, ...patch } : group)))
  }

  const addServeisGroup = () => {
    setServeisGroups((prev) => [
      ...prev,
      createServeiGroup({
        defaultMeetingPoint: meetingPoint || location || '',
        defaultStartTime: startTime,
        defaultEndTime: endTime,
        workers: 0,
      }),
    ])
  }

  const removeServeisGroup = (id: string) => {
    setServeisGroups((prev) => {
      const next = prev.filter((group) => group.id !== id)
      return next.length
        ? next
        : [
            createServeiGroup({
              defaultMeetingPoint: meetingPoint || location || '',
              defaultStartTime: startTime,
              defaultEndTime: endTime,
            }),
          ]
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
    setEttOpen(false)
    setEttData({
      serviceDate: extractDate(event.start),
      meetingPoint: event.location || event.eventLocation || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      workers: '',
    })
    const initialWorkers = Number(event.totalWorkers || 0)
    const initialDrivers = Number(event.numDrivers || 0)
    cuinaTotalsRef.current = { workers: initialWorkers, drivers: initialDrivers }
    setCuinaGroups([createGroup({ workers: initialWorkers, drivers: initialDrivers })])
    if (isServeis) {
      const baseMeetingPoint = event.meetingPoint || event.eventLocation || ''
      setServeisGroups([
        createServeiGroup({
          serviceDate: extractDate(event.start),
          defaultMeetingPoint: baseMeetingPoint,
          defaultStartTime: event.startTime || '',
          defaultEndTime: event.endTime || '',
          workers: Number(event.totalWorkers || 0),
        }),
      ])
    }
  }, [event, open, isServeis])

  const { responsables, conductors, loading: availLoading } = useAvailablePersonnel({
    departament: department,
    startDate,
    endDate,
    startTime,
    endTime,
  })
  const availableResponsables = responsables.filter((r) => Boolean(r.id?.trim()))
  const availableConductors = conductors.filter((c) => Boolean(c.id?.trim()))

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

    const manualResponsibleIdValue =
      manualResp && manualResp !== '__auto__' ? manualResp : null

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
        manualResponsibleId: manualResponsibleIdValue,
        service: event.service || null,
        numPax: event.numPax || null,
        commercial: event.commercial || null,
      }

      const timetables: Array<{ startTime: string; endTime: string }> = []

      const addTimetable = (entry: TimetableEntry) => {
        const tt = collectTimetable(entry)
        if (tt) timetables.push(tt)
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
        groupsPayload.forEach((group) => addTimetable(group))

      } else if (isServeis) {
        const groupsPayload = serveisGroups.map((group) => {
          const selected = responsables.find((r) => r.id === group.responsibleId)
          return {
            serviceDate: group.serviceDate,
            dateLabel: group.dateLabel || null,
            meetingPoint: group.meetingPoint || meetingPoint || '',
            startTime: group.startTime,
            endTime: group.endTime,
            workers: group.workers,
            drivers: group.needsDriver ? 1 : 0,
            needsDriver: group.needsDriver,
            driverId: group.driverId || null,
            // Serveis: responsable és per esdeveniment (no per grup)
            responsibleId: null,
            responsibleName: null,
          }
        })

        payload.groups = groupsPayload
        payload.totalWorkers = serveisTotals.workers
        payload.numDrivers = serveisTotals.drivers
        groupsPayload.forEach((group) => addTimetable(group))

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
        addTimetable({ startTime, endTime })
      }

      const ettWorkers = Number(ettData.workers || 0)
      if (ettWorkers > 0) {
        const ettEntry = {
          name: 'ETT',
          workers: ettWorkers,
          startDate: ettData.serviceDate || startDate,
          endDate: ettData.serviceDate || endDate,
          startTime: ettData.startTime || startTime,
          endTime: ettData.endTime || endTime,
          meetingPoint: ettData.meetingPoint || meetingPoint,
        }
        const existingBrigades = (payload.brigades as any[]) || []
        payload.brigades = [...existingBrigades, ettEntry]
        addTimetable({ startTime: ettData.startTime, endTime: ettData.endTime })
      }

      if (timetables.length) {
        payload.timetables = timetables
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
            {department === 'logistica' && (
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
          {isServeis && (
            <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Grups Serveis</p>
                  <p className="text-xs text-slate-500">
                    Treballadors {serveisTotals.workers} · Conductors {serveisTotals.drivers} ·
                    Responsables {serveisTotals.responsables}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={addServeisGroup}
                >
                  + Grup
                </Button>
              </div>
              <div className="space-y-3">
                {serveisGroups.map((group, idx) => (
                  <div
                    key={group.id}
                    className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Grup {idx + 1}</span>
                      {serveisGroups.length > 1 && (
                        <button
                          type="button"
                          className="text-red-500 hover:underline"
                          onClick={() => removeServeisGroup(group.id)}
                        >
                          Elimina grup
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Data servei</Label>
                        <Input
                          type="date"
                          value={group.serviceDate}
                          onChange={(e) =>
                            updateServeisGroup(group.id, { serviceDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Meeting point</Label>
                        <Input
                          value={group.meetingPoint}
                          onChange={(e) =>
                            updateServeisGroup(group.id, { meetingPoint: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Hora inici</Label>
                        <Input
                          type="time"
                          value={group.startTime}
                          onChange={(e) =>
                            updateServeisGroup(group.id, { startTime: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Hora fi</Label>
                        <Input
                          type="time"
                          value={group.endTime}
                          onChange={(e) =>
                            updateServeisGroup(group.id, { endTime: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    {group.serviceDate !== extractDate(event.start) && (
                      <div>
                        <Label>Nota del dia</Label>
                        <Input
                          type="text"
                          placeholder="Montatge"
                          value={group.dateLabel}
                          onChange={(e) =>
                            updateServeisGroup(group.id, { dateLabel: e.target.value })
                          }
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Treballadors</Label>
                        <Input
                          type="number"
                          min={0}
                          value={group.workers}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            updateServeisGroup(group.id, {
                              workers: Number.isNaN(value) ? 0 : value,
                            })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`need-driver-${group.id}`}
                            checked={group.needsDriver}
                            onCheckedChange={(checked) =>
                              updateServeisGroup(group.id, {
                                needsDriver: Boolean(checked),
                                driverId: checked ? group.driverId : '',
                              })
                            }
                          />
                          <Label htmlFor={`need-driver-${group.id}`} className="mb-0">
                            Necessita conductor?
                          </Label>
                        </div>
                        {group.needsDriver && (
                          <Select
                            value={group.driverId || '__none__'}
                            onValueChange={(value) =>
                              updateServeisGroup(group.id, {
                                driverId: value === '__none__' ? '' : value,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un conductor…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sense assignar</SelectItem>
                              {availableConductors.map((conductor) => (
                                <SelectItem key={conductor.id} value={conductor.id}>
                                  {conductor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    {/* Responsable per grup NO aplica a serveis (un sol responsable per esdeveniment) */}
                  </div>
                ))}
              </div>
            </div>
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
          {!isGroupDept && (
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
                            {availableResponsables.map((r) => (
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
          {isGroupDept && (
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">ETT</p>
                  <p className="text-xs text-slate-500">Afegeix un servei temporal</p>
                </div>
                <Button
                  size="sm"
                  variant={ettOpen ? 'secondary' : 'outline'}
                  onClick={() =>
                    setEttOpen((prev) => {
                      const next = !prev
                      if (next) {
                        setEttData((prevData) => ({
                          ...prevData,
                          serviceDate: startDate,
                          meetingPoint: location || prevData.meetingPoint,
                          startTime,
                          endTime,
                        }))
                      }
                      return next
                    })
                  }
                >
                  {ettOpen ? 'Amaga' : '+ ETT'}
                </Button>
              </div>
              {ettOpen ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Data servei</Label>
                      <Input
                        type="date"
                        value={ettData.serviceDate}
                        onChange={(e) =>
                          setEttData((prev) => ({
                            ...prev,
                            serviceDate: e.target.value || startDate,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Meeting point</Label>
                      <Input
                        value={ettData.meetingPoint}
                        onChange={(e) =>
                          setEttData((prev) => ({
                            ...prev,
                            meetingPoint: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Hora inici</Label>
                      <Input
                        type="time"
                        value={ettData.startTime}
                        onChange={(e) =>
                          setEttData((prev) => ({ ...prev, startTime: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Hora fi</Label>
                      <Input
                        type="time"
                        value={ettData.endTime}
                        onChange={(e) =>
                          setEttData((prev) => ({ ...prev, endTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Treballadors ETT</Label>
                    <Input
                      type="number"
                      min={0}
                      value={ettData.workers}
                      onChange={(e) => setEttData({ ...ettData, workers: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  ETT · {ettData.workers || '0'} treballadors (una sola línia)
                </p>
              )}
            </div>
          )}
          <div>
            <Label>Responsable (manual)</Label>
            {availLoading && (
              <p className="flex items-center gap-2 text-blue-600">
                <Loader2 className="animate-spin" /> Carregant…
              </p>
            )}
            {!availLoading && (
              <Select value={manualResp} onValueChange={setManualResp}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un responsable…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">— Automàtic —</SelectItem>
                  {availableResponsables.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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

