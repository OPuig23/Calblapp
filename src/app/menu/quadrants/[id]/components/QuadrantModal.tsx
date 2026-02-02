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

type LogisticPhaseKey = 'entrega' | 'event' | 'recollida'

const logisticPhaseOptions: Array<{ key: LogisticPhaseKey; label: string }> = [
  { key: 'entrega', label: 'Entrega' },
  { key: 'event', label: 'Event' },
  { key: 'recollida', label: 'Recollida' },
]

type PhaseVisibility = Record<LogisticPhaseKey, boolean>
const createPhaseVisibility = (): PhaseVisibility =>
  logisticPhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = phase.key === 'event'
    return acc
  }, {} as PhaseVisibility)

type LogisticPhaseSetting = {
  selected: boolean
  needsResponsible: boolean
}

const createPhaseSettings = () =>
  logisticPhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = {
      selected: phase.key === 'event',
      needsResponsible: phase.key === 'event',
    }
    return acc
  }, {} as Record<LogisticPhaseKey, LogisticPhaseSetting>)

type ServicePhaseKey = 'muntatge' | 'event'

const servicePhaseOptions: Array<{ key: ServicePhaseKey; label: string }> = [
  { key: 'muntatge', label: 'Muntatge' },
  { key: 'event', label: 'Event' },
]

type ServicePhaseVisibility = Record<ServicePhaseKey, boolean>
const createServicePhaseVisibility = (): ServicePhaseVisibility =>
  servicePhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = phase.key === 'event'
    return acc
  }, {} as ServicePhaseVisibility)

type ServicePhaseSetting = {
  selected: boolean
}

const createServicePhaseSettings = (): Record<ServicePhaseKey, ServicePhaseSetting> =>
  servicePhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = { selected: phase.key === 'event' }
    return acc
  }, {} as Record<ServicePhaseKey, ServicePhaseSetting>)

type LogisticPhaseForm = {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  workers: number
  drivers: number
  meetingPoint: string
}

type VehicleAssignment = {
  vehicleType: string
  vehicleId: string
  plate: string
  arrivalTime?: string
}

type AvailableVehicle = {
  id: string
  plate?: string
  type?: string
  available: boolean
}

const buildPhaseForms = (params: {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  workers: number
  drivers: number
  meetingPoint: string
}) =>
  logisticPhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = {
      startDate: params.startDate,
      endDate: params.endDate,
      startTime: params.startTime,
      endTime: params.endTime,
      workers: params.workers,
      drivers: params.drivers,
      meetingPoint: params.meetingPoint,
    }
    return acc
  }, {} as Record<LogisticPhaseKey, LogisticPhaseForm>)

const createPhaseResponsibles = () =>
  logisticPhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = '__auto__'
    return acc
  }, {} as Record<LogisticPhaseKey, string>)

const buildServicePhaseEtt = (base: {
  startDate: string
  meetingPoint: string
  startTime: string
  endTime: string
}) =>
  servicePhaseOptions.reduce((acc, phase) => {
    acc[phase.key] = {
      open: false,
      data: {
        serviceDate: base.startDate,
        meetingPoint: base.meetingPoint,
        startTime: base.startTime,
        endTime: base.endTime,
        workers: '',
      },
    }
    return acc
  }, {} as Record<ServicePhaseKey, ServicePhaseEtt>)

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
  const isLogistica = department === 'logistica'
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
  const initialPhaseParams = {
    startDate: extractDate(event.start),
    endDate: extractDate(event.start),
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    workers: event.totalWorkers ?? 0,
    drivers: event.numDrivers ?? 0,
    meetingPoint: meetingPoint || location || '',
  }
  const [phaseForms, setPhaseForms] = useState(() => buildPhaseForms(initialPhaseParams))
  const [phaseVisibility, setPhaseVisibility] = useState(() => createPhaseVisibility())
  const [phaseResponsibles, setPhaseResponsibles] = useState(() => createPhaseResponsibles())
  const [phaseSettings, setPhaseSettings] = useState(() => createPhaseSettings())
  const [servicePhaseVisibility, setServicePhaseVisibility] = useState(
    () => createServicePhaseVisibility()
  )
  const [servicePhaseSettings, setServicePhaseSettings] = useState(
    () => createServicePhaseSettings()
  )
  const [phaseVehicleAssignments, setPhaseVehicleAssignments] = useState<
    Record<LogisticPhaseKey, VehicleAssignment[]>
  >(() =>
    logisticPhaseOptions.reduce((acc, phase) => {
      acc[phase.key] = []
      return acc
    }, {} as Record<LogisticPhaseKey, VehicleAssignment[]>)
  )
  const normalizeVehicleType = (value?: string) => {
    const val = (value || '').toString().toLowerCase()
    if (!val) return ''
    if (val.includes('petit')) return 'camioPetit'
    if (val.includes('gran')) return 'camioGran'
    if (val.includes('furgo')) return 'furgoneta'
    return val
  }
  const isVehicleIdAssigned = (
    vehicleId: string,
    currentPhase: LogisticPhaseKey,
    currentIndex: number
  ) => {
    if (!vehicleId) return false
    for (const phase of logisticPhaseOptions) {
      const assignments = phaseVehicleAssignments[phase.key] || []
      for (let idx = 0; idx < assignments.length; idx += 1) {
        if (phase.key === currentPhase && idx === currentIndex) continue
        if (assignments[idx]?.vehicleId === vehicleId) return true
      }
    }
    return false
  }
  const updatePhaseVehicleAssignment = (
    phaseKey: LogisticPhaseKey,
    index: number,
    patch: Partial<VehicleAssignment>
  ) => {
    setPhaseVehicleAssignments((prev) => {
      const phaseAssignments = prev[phaseKey] || []
      if (index < 0 || index >= phaseAssignments.length) return prev
      const updated = [...phaseAssignments]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, [phaseKey]: updated }
    })
  }
  const buildVehiclesPayloadFromAssignments = () => {
    const payload: Array<{
      id: string
      plate: string
      vehicleType: string
      conductorId: string | null
      arrivalTime: string
    }> = []
    logisticPhaseOptions.forEach((phase) => {
      const assignments = phaseVehicleAssignments[phase.key] || []
      assignments.forEach((assignment) => {
        const vehicleId = assignment.vehicleId || ''
        const matched = available.vehicles.find((v) => v.id === vehicleId)
        const vehicleType = normalizeVehicleType(
          assignment.vehicleType || matched?.type || ''
        )
        if (!vehicleType && !vehicleId) return
        payload.push({
          id: vehicleId,
          plate: assignment.plate || matched?.plate || '',
          vehicleType,
          conductorId: matched?.conductorId || null,
          arrivalTime: assignment.arrivalTime || '',
        })
      })
    })
    return payload
  }
  const [servicePhaseEtt, setServicePhaseEtt] = useState(() =>
    buildServicePhaseEtt({
      startDate: extractDate(event.start),
      meetingPoint: meetingPoint || location || event.eventLocation || '',
      startTime,
      endTime,
    })
  )
  const [available, setAvailable]       = useState<{ vehicles: AvailableVehicle[] }>({ vehicles: [] })
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
  phaseKey: ServicePhaseKey
  needsDriver: boolean
  driverId: string
}

type ServeiGroupSeed = Partial<ServeiGroup> & {
  defaultMeetingPoint?: string
  defaultStartTime?: string
  defaultEndTime?: string
}

type ServicePhaseEttData = {
  serviceDate: string
  meetingPoint: string
  startTime: string
  endTime: string
  workers: string
}

type ServicePhaseEtt = {
  open: boolean
  data: ServicePhaseEttData
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

  const createServeiGroup = (
    phaseKey: ServicePhaseKey,
    seed: ServeiGroupSeed = {}
  ): ServeiGroup => ({
    id: seed.id || makeGroupId(),
    phaseKey,
    serviceDate: seed.serviceDate ?? extractDate(event.start),
    dateLabel:
      seed.dateLabel ??
      servicePhaseOptions.find((phase) => phase.key === phaseKey)?.label ??
      '',
    meetingPoint:
      seed.meetingPoint ?? seed.defaultMeetingPoint ?? meetingPoint ?? location ?? '',
    startTime: seed.startTime ?? seed.defaultStartTime ?? startTime ?? '',
    endTime: seed.endTime ?? seed.defaultEndTime ?? endTime ?? '',
    workers: seed.workers ?? 0,
    responsibleId: seed.responsibleId ?? '',
    needsDriver: seed.needsDriver ?? false,
    driverId: seed.driverId ?? '',
  })

  const createServicePhaseGroups = (overrides: ServeiGroupSeed[] = []): ServeiGroup[] =>
    servicePhaseOptions.map((phase, idx) =>
      createServeiGroup(phase.key, {
        ...overrides[idx],
        serviceDate:
          overrides[idx]?.serviceDate ?? extractDate(event.start),
        defaultMeetingPoint:
          (overrides[idx]?.defaultMeetingPoint ?? meetingPoint) ||
          location ||
          event.eventLocation ||
          '',
        defaultStartTime: overrides[idx]?.defaultStartTime ?? startTime,
        defaultEndTime: overrides[idx]?.defaultEndTime ?? endTime,
        workers: overrides[idx]?.workers ?? Number(event.totalWorkers || 0),
      })
    )

  const [cuinaGroups, setCuinaGroups] = useState<CuinaGroup[]>(() => [createGroup()])
  const [serveisGroups, setServeisGroups] = useState<ServeiGroup[]>(() =>
    createServicePhaseGroups([
      {
        defaultMeetingPoint: meetingPoint || location || '',
        defaultStartTime: startTime,
        defaultEndTime: endTime,
      },
    ])
  )
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

  const activeServeisGroups = useMemo(
    () =>
      serveisGroups.filter((group) =>
        servicePhaseSettings[group.phaseKey]?.selected ?? true
      ),
    [serveisGroups, servicePhaseSettings]
  )

  const serveisTotals = useMemo(
    () => ({
      workers: activeServeisGroups.reduce((sum, group) => sum + group.workers, 0),
      drivers: activeServeisGroups.filter((group) => group.needsDriver).length,
      responsables: activeServeisGroups.length,
    }),
    [activeServeisGroups]
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

  const updatePhaseForm = (key: LogisticPhaseKey, patch: Partial<LogisticPhaseForm>) => {
    setPhaseForms((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }))
  }

  const updatePhaseResponsible = (key: LogisticPhaseKey, value: string) => {
    setPhaseResponsibles((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const togglePhaseVisibility = (key: LogisticPhaseKey) => {
    setPhaseVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const updatePhaseSetting = (
    key: LogisticPhaseKey,
    patch: Partial<LogisticPhaseSetting>
  ) => {
    setPhaseSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }))
  }

  const updateServeisGroup = (id: string, patch: Partial<ServeiGroup>) => {
    setServeisGroups((prev) =>
      prev.map((group) => (group.id === id ? { ...group, ...patch } : group))
    )
  }

  const addServeisGroup = (phaseKey: ServicePhaseKey) => {
    const groupsForPhase = serveisGroups.filter((group) => group.phaseKey === phaseKey)
    const lastGroup = groupsForPhase[groupsForPhase.length - 1]
    const meetingPointValue =
      lastGroup?.meetingPoint ||
      meetingPoint ||
      location ||
      event.eventLocation ||
      ''
    const startTimeValue = lastGroup?.startTime || startTime
    const endTimeValue = lastGroup?.endTime || endTime
    setServeisGroups((prev) => [
      ...prev,
      createServeiGroup(phaseKey, {
        meetingPoint: meetingPointValue,
        startTime: startTimeValue,
        endTime: endTimeValue,
        workers: 0,
      }),
    ])
  }

  const removeServeisGroup = (id: string, phaseKey: ServicePhaseKey) => {
    setServeisGroups((prev) => {
      const groupsForPhase = prev.filter((group) => group.phaseKey === phaseKey)
      if (groupsForPhase.length <= 1) return prev
      return prev.filter((group) => group.id !== id)
    })
  }

  const toggleServicePhaseVisibility = (key: ServicePhaseKey) => {
    setServicePhaseVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleServicePhaseSelection = (key: ServicePhaseKey) => {
    setServicePhaseSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        selected: !prev[key].selected,
      },
    }))
  }

  const toggleServicePhaseEtt = (key: ServicePhaseKey) => {
    setServicePhaseEtt((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        open: !prev[key].open,
      },
    }))
  }

  const updateServicePhaseEtt = (
    key: ServicePhaseKey,
    patch: Partial<ServicePhaseEttData>
  ) => {
    setServicePhaseEtt((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        data: {
          ...prev[key].data,
          ...patch,
        },
      },
    }))
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
      const overrides = servicePhaseOptions.map(() => ({
        serviceDate: extractDate(event.start),
        defaultMeetingPoint: baseMeetingPoint,
        defaultStartTime: event.startTime || '',
        defaultEndTime: event.endTime || '',
        workers: Number(event.totalWorkers || 0),
      }))
      setServeisGroups(createServicePhaseGroups(overrides))
      const ettBase = {
        startDate: extractDate(event.start),
        meetingPoint: baseMeetingPoint || location || event.eventLocation || '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
      }
      setServicePhaseEtt(buildServicePhaseEtt(ettBase))
    }
  }, [event, open, isServeis])

  useEffect(() => {
    const params = {
      startDate: extractDate(event.start),
      endDate: extractDate(event.start),
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      workers: Number(event.totalWorkers || 0),
      drivers: Number(event.numDrivers || 0),
      meetingPoint: event.meetingPoint || event.location || event.eventLocation || '',
    }
    setPhaseForms(buildPhaseForms(params))
    setPhaseSettings(createPhaseSettings())
    setPhaseResponsibles(createPhaseResponsibles())
    setServicePhaseVisibility(createServicePhaseVisibility())
    setServicePhaseSettings(createServicePhaseSettings())
    setServeisGroups(createServicePhaseGroups())
    setServicePhaseEtt(
      buildServicePhaseEtt({
        startDate: params.startDate,
        meetingPoint: params.meetingPoint,
        startTime: params.startTime,
        endTime: params.endTime,
      })
    )
  }, [event.id])

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
    if (!isLogistica) return
    const totalPhaseDrivers = logisticPhaseOptions.reduce((sum, phase) => {
      const phaseForm = phaseForms[phase.key]
      return sum + (phaseForm ? Number(phaseForm.drivers || 0) : 0)
    }, 0)
    const targetDrivers = totalPhaseDrivers.toString()
    if (numDrivers !== targetDrivers) {
      setNumDrivers(targetDrivers)
    }
  }, [isLogistica, phaseForms, numDrivers])

  const createPhaseVehicleAssignments = (drivers: number, previous: VehicleAssignment[] = []) => {
    const count = Math.max(0, Number.isFinite(drivers) ? drivers : Number(drivers))
    return Array.from({ length: count }).map((_, idx) => ({
      vehicleType: previous[idx]?.vehicleType || '',
      vehicleId: previous[idx]?.vehicleId || '',
      plate: previous[idx]?.plate || '',
      arrivalTime: previous[idx]?.arrivalTime || '',
    }))
  }

  useEffect(() => {
    if (!isLogistica) return
    setPhaseVehicleAssignments((prev) => {
      const next: Record<LogisticPhaseKey, VehicleAssignment[]> = { ...prev }
      logisticPhaseOptions.forEach((phase) => {
        const drivers = phaseForms[phase.key]?.drivers ?? 0
        const existing = prev[phase.key] || []
        const updated = createPhaseVehicleAssignments(drivers, existing)
        next[phase.key] = updated
      })
      return next
    })
  }, [isLogistica, phaseForms])

  const canAutoGen = Boolean(startDate) && Boolean(endDate) && Boolean(startTime) && Boolean(endTime)

  const handleAutoGenAndSave = async () => {
    if (!canAutoGen) return
    setLoading(true); setError(null); setSuccess(false)

    const manualResponsibleIdValue =
      manualResp && manualResp !== '__auto__' ? manualResp : null
    const manualResponsibleNameValue =
      manualResponsibleIdValue && availableResponsables.length
        ? availableResponsables.find((r) => r.id === manualResponsibleIdValue)?.name ?? null
        : null

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
        const selectedServiceGroups = serveisGroups.filter((group) =>
          servicePhaseSettings[group.phaseKey]?.selected ?? true
        )
        const fallbackGroup = serveisGroups[0]
        const groupsToUse = selectedServiceGroups.length
          ? selectedServiceGroups
          : fallbackGroup
          ? [fallbackGroup]
          : []

        const groupsPayload = groupsToUse.map((group) => {
          const isEventPhase = group.phaseKey === 'event'
          const assignedResponsibleId = isEventPhase ? manualResponsibleIdValue : null
          const assignedResponsibleName = isEventPhase ? manualResponsibleNameValue : null
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
            responsibleId: assignedResponsibleId,
            responsibleName: assignedResponsibleName,
            wantsResponsible: isEventPhase,
          }
        })

        payload.groups = groupsPayload
        payload.totalWorkers = serveisTotals.workers
        payload.numDrivers = serveisTotals.drivers
        groupsPayload.forEach((group) => addTimetable(group))

      } else {
        const vehiclesPayload = buildVehiclesPayloadFromAssignments()

        const baseLogisticPayload: Record<string, unknown> = {
          ...payload,
          totalWorkers: Number(totalWorkers),
          numDrivers: Number(numDrivers),
          vehicles: vehiclesPayload,
        }

        const ettWorkers = Number(ettData.workers || 0)
        const ettEntry =
          ettWorkers > 0
            ? {
                name: 'ETT',
                workers: ettWorkers,
                startDate: ettData.serviceDate || startDate,
                endDate: ettData.serviceDate || endDate,
                startTime: ettData.startTime || startTime,
                endTime: ettData.endTime || endTime,
                meetingPoint: ettData.meetingPoint || meetingPoint,
              }
            : null

        const payloadWithBrigades = ettEntry
          ? {
              ...baseLogisticPayload,
              brigades: [
                ...(Array.isArray(baseLogisticPayload.brigades)
                  ? (baseLogisticPayload.brigades as any[])
                  : []),
                ettEntry,
              ],
            }
          : baseLogisticPayload

        const buildTimetablesForPhase = (form: LogisticPhaseForm) => {
          const list: Array<{ startTime: string; endTime: string }> = []
          const add = (entry: TimetableEntry) => {
            const tt = collectTimetable(entry)
            if (tt) list.push(tt)
          }
          add({ startTime: form.startTime, endTime: form.endTime })
          if (ettEntry) {
            add({
              startTime: ettEntry.startTime,
              endTime: ettEntry.endTime,
            })
          }
          return list
        }

        const selectedPhaseKeys = Object.entries(phaseSettings)
          .filter(([, setting]) => setting.selected)
          .map(([key]) => key as LogisticPhaseKey)
        const fallbackPhase = (event.phaseKey as LogisticPhaseKey) ?? 'entrega'
        const phasesToCreate = selectedPhaseKeys.length ? selectedPhaseKeys : [fallbackPhase]

        const getManualForPhase = (phaseKey: LogisticPhaseKey) => {
          const entry = phaseResponsibles[phaseKey] ?? '__auto__'
          return entry && entry !== '__auto__' ? entry : null
        }

        const logisticaPhases = phasesToCreate.map((phaseKey) => {
          const form = phaseForms[phaseKey] ?? {
            startDate: extractDate(event.start),
            endDate: extractDate(event.start),
            startTime,
            endTime,
            workers: Number(totalWorkers) || 0,
            drivers: Number(numDrivers) || 0,
            meetingPoint: meetingPoint || location || '',
          }
          const phaseSetting = phaseSettings[phaseKey] ?? { selected: true, needsResponsible: true }
          const phaseTimetables = buildTimetablesForPhase(form)
          const label =
            logisticPhaseOptions.find((phase) => phase.key === phaseKey)?.label || phaseKey
          return {
            label,
            phaseType: phaseKey,
            date: form.startDate,
            endDate: form.endDate,
            startTime: form.startTime,
            endTime: form.endTime,
            totalWorkers: form.workers,
            numDrivers: form.drivers,
            wantsResp: phaseSetting.needsResponsible,
            responsableId: phaseSetting.needsResponsible ? getManualForPhase(phaseKey) : null,
            meetingPoint: form.meetingPoint || meetingPoint || location || '',
            vehicles: vehiclesPayload,
            timetables: phaseTimetables,
          }
        })

        const res = await fetch('/api/quadrants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payloadWithBrigades,
            logisticaPhases,
          }),
        })
        const text = await res.text()
        const data = JSON.parse(text)

        if (!res.ok || (data as any)?.ok === false) {
          throw new Error((data as any)?.error || 'Error desant el quadrant')
        }

        setSuccess(true)
        toast.success('Borrador creat correctament!')
        window.dispatchEvent(new CustomEvent('quadrant:created', { detail: { status: 'draft' } }))
        onOpenChange(false)
        return
      }

      type EttEntry = {
        name: string
        workers: number
        startDate: string
        endDate: string
        startTime: string
        endTime: string
        meetingPoint: string
      }
      const ettEntries: EttEntry[] = []

      if (isServeis) {
        Object.values(servicePhaseEtt).forEach((ettState) => {
          const workers = Number(ettState.data.workers || 0)
          if (!workers) return
          ettEntries.push({
            name: 'ETT',
            workers,
            startDate: ettState.data.serviceDate || startDate,
            endDate: ettState.data.serviceDate || endDate,
            startTime: ettState.data.startTime || startTime,
            endTime: ettState.data.endTime || endTime,
            meetingPoint: ettState.data.meetingPoint || meetingPoint,
          })
        })
      } else {
        const ettWorkers = Number(ettData.workers || 0)
        if (ettWorkers > 0) {
          ettEntries.push({
            name: 'ETT',
            workers: ettWorkers,
            startDate: ettData.serviceDate || startDate,
            endDate: ettData.serviceDate || endDate,
            startTime: ettData.startTime || startTime,
            endTime: ettData.endTime || endTime,
            meetingPoint: ettData.meetingPoint || meetingPoint,
          })
        }
      }

      if (ettEntries.length) {
        const existingBrigades = (payload.brigades as any[]) || []
        payload.brigades = [...existingBrigades, ...ettEntries]
        ettEntries.forEach((entry) =>
          addTimetable({ startTime: entry.startTime, endTime: entry.endTime })
        )
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
          {!isLogistica && (
            <div className="grid grid-cols-2 gap-4">
              {!isServeis && (
                <>
                  <div>
                    <Label>Data Inici</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              {!isCuina && (
                <div className={`${isServeis ? 'col-span-2 sm:col-span-1' : ''}`}>
                  <Label>Hora Inici</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
              )}
              {!isCuina && (
                <div className={`${isServeis ? 'col-span-2 sm:col-span-1' : ''}`}>
                  <Label>Hora Fi</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {department.toLowerCase() !== 'logistica' && (
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
                    {availableResponsables.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Camps específics */}
          {isServeis && (
            <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Fase serveis</p>
                  <p className="text-xs text-slate-500">
                    Treballadors {serveisTotals.workers} · Conductors {serveisTotals.drivers} ·
                    Fases {serveisTotals.responsables}
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {servicePhaseOptions.map((phase) => {
                  const groupsForPhase = serveisGroups.filter((g) => g.phaseKey === phase.key)
                  if (!groupsForPhase.length) return null
                  const visible = servicePhaseVisibility[phase.key] ?? true
                  const settings = servicePhaseSettings[phase.key] ?? { selected: true }
                  const isSelected = settings.selected

                  const ettState = servicePhaseEtt[phase.key] ?? {
                    open: false,
                    data: {
                      serviceDate: startDate,
                      meetingPoint: meetingPoint || location || event.eventLocation || '',
                      startTime,
                      endTime,
                      workers: '',
                    },
                  }
                  const ettOpen = ettState.open
                  const ettWorkersCount = Number(ettState.data.workers || 0)

                  return (
                    <div
                      key={phase.key}
                      className={`rounded-xl border p-3 transition ${
                        visible ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{phase.label}</p>
                          <p className="text-xs text-slate-500">Activar per generar aquesta fase</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() => toggleServicePhaseSelection(phase.key)}
                          >
                            {isSelected ? 'Inclosa' : 'No inclosa'}
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              visible
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() => toggleServicePhaseVisibility(phase.key)}
                          >
                            {visible ? 'Amaga' : 'Mostra'}
                          </button>
                        </div>
                      </div>

                      {visible && isSelected && (
                        <div className="space-y-3 mt-4">
                          {groupsForPhase.map((group, idx) => (
                            <div
                              key={group.id}
                              className="border border-slate-200 rounded-xl bg-white p-3 space-y-3"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Grup {idx + 1}</span>
                                {groupsForPhase.length > 1 && (
                                  <button
                                    type="button"
                                    className="text-red-500 hover:underline"
                                    onClick={() => removeServeisGroup(group.id, phase.key)}
                                  >
                                    Elimina grup
                                  </button>
                                )}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label>Data servei</Label>
                                  <Input
                                    type="date"
                                    value={group.serviceDate}
                                    onChange={(e) =>
                                      updateServeisGroup(group.id, {
                                        serviceDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Meeting point</Label>
                                  <Input
                                    value={group.meetingPoint}
                                    onChange={(e) =>
                                      updateServeisGroup(group.id, {
                                        meetingPoint: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
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
                                    placeholder="Muntatge"
                                    value={group.dateLabel}
                                    onChange={(e) =>
                                      updateServeisGroup(group.id, { dateLabel: e.target.value })
                                    }
                                  />
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-2">
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
                                      id={`needs-driver-${group.id}`}
                                      checked={group.needsDriver}
                                      onCheckedChange={(checked) =>
                                        updateServeisGroup(group.id, {
                                          needsDriver: Boolean(checked),
                                          driverId: checked ? group.driverId : '',
                                        })
                                      }
                                    />
                                    <Label htmlFor={`needs-driver-${group.id}`} className="mb-0">
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
                            </div>
                          ))}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => addServeisGroup(phase.key)}
                            >
                              + Grup
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-900 border-slate-200 bg-white shadow-sm"
                              onClick={() => toggleServicePhaseEtt(phase.key)}
                            >
                              {ettOpen ? 'Amaga ETT' : '+ ETT'}
                            </Button>
                          </div>

                          {ettOpen ? (
                            <div className="space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label>Data servei</Label>
                                  <Input
                                    type="date"
                                    value={ettState.data.serviceDate}
                                    onChange={(e) =>
                                      updateServicePhaseEtt(phase.key, { serviceDate: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Meeting point</Label>
                                  <Input
                                    value={ettState.data.meetingPoint}
                                    onChange={(e) =>
                                      updateServicePhaseEtt(phase.key, { meetingPoint: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label>Hora inici</Label>
                                  <Input
                                    type="time"
                                    value={ettState.data.startTime}
                                    onChange={(e) =>
                                      updateServicePhaseEtt(phase.key, { startTime: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Hora fi</Label>
                                  <Input
                                    type="time"
                                    value={ettState.data.endTime}
                                    onChange={(e) =>
                                      updateServicePhaseEtt(phase.key, { endTime: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Treballadors ETT</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={ettState.data.workers}
                                  onChange={(e) =>
                                    updateServicePhaseEtt(phase.key, { workers: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              ETT · {ettWorkersCount} treballadors
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {department.toLowerCase() === 'logistica' && (
            <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">Fase logística</p>
              <div className="grid gap-3">
                {logisticPhaseOptions.map((phase) => {
                  const visible = phaseVisibility[phase.key] ?? true
                  const form =
                    phaseForms[phase.key] ??
                    ({
                      startDate: extractDate(event.start),
                      endDate: extractDate(event.start),
                      startTime,
                      endTime,
                      workers: Number(totalWorkers) || 0,
                      drivers: Number(numDrivers) || 0,
                      meetingPoint: meetingPoint || location || '',
                    } as LogisticPhaseForm)
                  const responsibleValue = phaseResponsibles[phase.key] ?? '__auto__'
                  const settings = phaseSettings[phase.key] ?? {
                    selected: true,
                    needsResponsible: phase.key === 'event',
                  }
                  const showResponsibleControls = phase.key === 'event'
                  const needsResponsible = showResponsibleControls && settings.needsResponsible
                  const isSelected = settings.selected
                  const assignments = phaseVehicleAssignments[phase.key] ?? []
                  const availableVehicleCount = available.vehicles.filter((v) => v.available).length

                  return (
                    <div
                      key={phase.key}
                      className={`rounded-xl border p-3 transition ${
                        visible ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{phase.label}</p>
                          <p className="text-xs text-slate-500">Activar per generar aquesta fase</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() =>
                              updatePhaseSetting(phase.key, { selected: !isSelected })
                            }
                          >
                            {isSelected ? 'Inclosa' : 'No inclosa'}
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              visible
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() => togglePhaseVisibility(phase.key)}
                          >
                            {visible ? 'Amaga' : 'Mostra'}
                          </button>
                        </div>
                      </div>

                      {visible && (
                        <div className="space-y-3 mt-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label>Data Inici</Label>
                              <Input
                                type="date"
                                value={form.startDate}
                                onChange={(e) =>
                                  updatePhaseForm(phase.key, { startDate: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Data Final</Label>
                              <Input
                                type="date"
                                value={form.endDate}
                                onChange={(e) =>
                                  updatePhaseForm(phase.key, { endDate: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label>Hora Inici</Label>
                              <Input
                                type="time"
                                value={form.startTime}
                                onChange={(e) =>
                                  updatePhaseForm(phase.key, { startTime: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Hora Fi</Label>
                              <Input
                                type="time"
                                value={form.endTime}
                                onChange={(e) =>
                                  updatePhaseForm(phase.key, { endTime: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label># Treballadors</Label>
                              <Input
                                type="number"
                                min={0}
                                value={form.workers}
                                onChange={(e) => {
                                  const value = Number(e.target.value)
                                  updatePhaseForm(phase.key, {
                                    workers: Number.isNaN(value) ? 0 : value,
                                  })
                                }}
                              />
                            </div>
                            <div>
                              <Label># Conductors</Label>
                              <Input
                                type="number"
                                min={0}
                                value={form.drivers}
                                onChange={(e) => {
                                  const value = Number(e.target.value)
                                  updatePhaseForm(phase.key, {
                                    drivers: Number.isNaN(value) ? 0 : value,
                                  })
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Lloc de concentració</Label>
                            <Input
                              type="text"
                              value={form.meetingPoint}
                              onChange={(e) =>
                                updatePhaseForm(phase.key, { meetingPoint: e.target.value })
                              }
                            />
                          </div>
                          {assignments.length > 0 && (
                            <div className="space-y-3 mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                              <div className="text-xs text-gray-500">
                                Vehicles disponibles (total): {availableVehicleCount} / {available.vehicles.length}
                              </div>
                              {assignments.map((assign, idx) => {
                                const filtered = available.vehicles.filter((vehicle) => {
                                  if (!vehicle.available) return false
                                  if (normalizeVehicleType(vehicle.type) !== normalizeVehicleType(assign.vehicleType)) return false
                                  return !isVehicleIdAssigned(vehicle.id, phase.key, idx)
                                })
                                return (
                                  <div key={idx} className="border border-slate-200 rounded-xl bg-white p-3 space-y-2">
                                    <p className="text-sm font-semibold">Vehicle #{idx + 1}</p>
                                    <Select
                                      value={assign.vehicleType}
                                      onValueChange={(val) =>
                                        updatePhaseVehicleAssignment(phase.key, idx, {
                                          vehicleType: val,
                                          vehicleId: '',
                                          plate: '',
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Tipus de vehicle" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="camioPetit">Camió petit</SelectItem>
                                        <SelectItem value="furgoneta">Furgoneta</SelectItem>
                                        <SelectItem value="camioGran">Camió gran</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {assign.vehicleType && (
                                      <>
                                        <div className="text-xs text-gray-500">
                                          Matrícules disponibles: {filtered.length}
                                        </div>
                                        <Select
                                          value={assign.vehicleId}
                                          onValueChange={(val) => {
                                            if (val === '__any__') {
                                              updatePhaseVehicleAssignment(phase.key, idx, {
                                                vehicleId: '',
                                                plate: '',
                                              })
                                              return
                                            }
                                            const chosen = available.vehicles.find((v) => v.id === val)
                                            updatePhaseVehicleAssignment(phase.key, idx, {
                                              vehicleId: val,
                                              plate: chosen?.plate || '',
                                              vehicleType: normalizeVehicleType(chosen?.type),
                                            })
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Tipus només o matrícula" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__any__">(Només tipus, sense matrícula)</SelectItem>
                                            {filtered.map((vehicle) => (
                                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                                {vehicle.plate || '(sense matrícula)'}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <div className="space-y-1 pt-2">
                                          <Label>Hora d'arribada</Label>
                                          <Input
                                            type="time"
                                            value={assign.arrivalTime || ''}
                                            onChange={(e) =>
                                              updatePhaseVehicleAssignment(phase.key, idx, {
                                                arrivalTime: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {showResponsibleControls && (
                            <>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`needs-resp-${phase.key}`}
                                  checked={needsResponsible}
                                  onCheckedChange={(checked) =>
                                    updatePhaseSetting(phase.key, {
                                      needsResponsible: Boolean(checked),
                                    })
                                  }
                                />
                                <Label htmlFor={`needs-resp-${phase.key}`} className="mb-0 text-sm">
                                  Necessita responsable?
                                </Label>
                              </div>

                              {needsResponsible && (
                                <div>
                                  <Label>Responsable</Label>
                                  {availLoading ? (
                                    <p className="flex items-center gap-2 text-blue-600 text-xs">
                                      <Loader2 className="animate-spin" /> Carregant…
                                    </p>
                                  ) : (
                                    <Select
                                      value={responsibleValue}
                                      onValueChange={(value) =>
                                        updatePhaseResponsible(phase.key, value)
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
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Meeting point */}
          {!isLogistica && !isGroupDept && (
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
          {isCuina && (
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">ETT</p>
                  <p className="text-xs text-slate-500">Afegeix un servei temporal</p>
                </div>
                <Button
                  size="sm"
                  variant={ettOpen ? 'secondary' : 'outline'}
                  className="text-slate-900 border-slate-200 bg-white shadow-sm"
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

