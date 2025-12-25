// File: src/app/menu/quadrants/[id]/components/QuadrantModal.tsx
'use client'

import { useState, useEffect } from 'react'
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
import QuadrantFieldsCuina from './QuadrantFieldsCuina'

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
  const department = session?.user?.department || ''

  const rawTitle = event.summary || event.title || ''
  const { name: eventName, code: parsedCode } = splitTitle(rawTitle)
  const eventCode = parsedCode || (rawTitle.match(/[A-Z]\d{6,}/)?.[0] ?? '').toUpperCase()
  const [startDate, setStartDate]       = useState(extractDate(event.start))
  const [endDate, setEndDate]           = useState(extractDate(event.start))
  const [startTime, setStartTime]       = useState(event.startTime || '')
  const [endTime, setEndTime]           = useState(event.endTime || '')
  const [arrivalTime, setArrivalTime]   = useState('')
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

  useEffect(() => {
    setStartDate(extractDate(event.start))
    setEndDate(extractDate(event.start))
    setStartTime(event.startTime || '')
    setEndTime(event.endTime || '')
    setArrivalTime('')
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
        manualResponsibleId: manualResp || null,
        service: event.service || null,
        numPax: event.numPax || null,
        commercial: event.commercial || null,
      }

      if (department.toLowerCase() === 'serveis') {
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
            Quadrant per a <strong>{department}</strong>
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
            <div>
              <Label>Hora Inici</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Hora arribada (esdeveniment)</Label>
              <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </div>
            <div>
              <Label>Hora Fi</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
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
          {department.toLowerCase() === 'cuina' && (
            <QuadrantFieldsCuina
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
          <div>
            <Label>Lloc de concentració</Label>
            <Input
              type="text"
              placeholder="Ex: Pàrquing camions"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
            />
          </div>

          {/* Responsable */}
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
