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

// 👇 Imports dels subcomponents
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
  }
}

// Helpers
const extractDate = (iso = '') => iso.split('T')[0] || ''

/** Extreu el codi (C/E/F/P/S + dígits) del títol, tant si ve amb # com si ve al final amb guió. */
const parseEventCode = (title = ''): string => {
  const t = String(title || '')
  // intenta "#CODE"
  const mHash = t.match(/#\s*([A-Z]{1,2}\d{5,})\b/i)
  if (mHash) return mHash[1].toUpperCase()
  // intenta l'últim token tipus C1234567 al final del text
  const all = [...t.matchAll(/\b([A-Z]{1,2}\d{5,})\b/gi)]
  if (all.length) return all[all.length - 1][1].toUpperCase()
  return ''
}

/** Retorna { name, code } netejant el codi si venia al final. */
const splitTitle = (title = '') => {
  const code = parseEventCode(title)
  let name = title
  if (code) {
    // treu " - CODE" o "#CODE" del final
    name = name.replace(new RegExp(`([\\-–—#]\\s*)?${code}\\s*$`, 'i'), '').trim()
  }
  return { name: name.trim(), code }
}

const getLN = (code = '', dept = '') => {
  const k = code ? code[0]?.toUpperCase() : ''
  switch (k) {
    case 'C': return 'Casaments'
    case 'E': return 'Empreses'
    case 'F': return 'Foodlovers'
    case 'P': return 'Producció'
    case 'S': return 'Serveis'
    default:
      // fallback per si no hem trobat codi
      switch ((dept || '').toLowerCase()) {
        case 'serveis': return 'Serveis'
        case 'logistica': return 'Logística'
        case 'cuina': return 'Cuina'
        default: return 'Altres'
      }
  }
}


export default function QuadrantModal({ open, onOpenChange, event }: QuadrantModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const department = session?.user?.department || ''

  const { name: eventName, code: eventCode } = splitTitle(event.summary || event.title || '')

  // 🔑 Estat comú
  const [startDate, setStartDate]       = useState(extractDate(event.start))
  const [endDate, setEndDate]           = useState(extractDate(event.start))
  const [startTime, setStartTime]       = useState(event.startTime || '')
  const [endTime, setEndTime]           = useState(event.endTime || '')
  const [location, setLocation]         = useState(event.location || event.eventLocation || '')
  const [meetingPoint, setMeetingPoint] = useState(event.meetingPoint || '')
  const [manualResp, setManualResp]     = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)

  // 🔑 Estat específic Logística / Cuina
  const [totalWorkers, setTotalWorkers] = useState(event.totalWorkers?.toString() || '')
  const [numDrivers, setNumDrivers]     = useState(event.numDrivers?.toString() || '')
  const [available, setAvailable]       = useState<{ vehicles: any[] }>({ vehicles: [] })
  const [vehicleAssignments, setVehicleAssignments] = useState<
    { vehicleType: string; vehicleId: string; plate: string }[]
  >([])

  // 🔑 Estat específic Serveis
  const [serveisData, setServeisData] = useState({
    workers: Number(event.totalWorkers || 0),
    drivers: Number(event.numDrivers || 0),
    brigades: [] as { id: string; name: string; workers: number; startTime: string; endTime: string }[],
  })

  // Reset quan canvia event
  useEffect(() => {
    setStartDate(extractDate(event.start))
    setEndDate(extractDate(event.start))
    setStartTime(event.startTime || '')
    setEndTime(event.endTime || '')
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

  // Responsables
  const { responsables, loading: availLoading } = useAvailablePersonnel({
    departament: department,
    startDate,
    endDate,
    startTime,
    endTime,
  })
  const getRespStatus = (id: string) => {
    const r = responsables.find(x => x.id === id)
    if (!r) return 'notfound'
    return r.status === 'available' ? 'ok' : 'conflict'
  }

  // Carregar vehicles disponibles (només logística/cuini)
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
          } catch (e) {
            return { vehicles: [] }
          }
        })
        .then((data) => setAvailable(data))
        .catch(() => setAvailable({ vehicles: [] }))
    }
  }, [department, startDate, startTime, endDate, endTime, totalWorkers])

  // Inicialitzar vehicles segons numDrivers
  useEffect(() => {
    setVehicleAssignments(
      Array.from({ length: Number(numDrivers || 0) }).map(() => ({
        vehicleType: '',
        vehicleId: '',
        plate: '',
      }))
    )
  }, [numDrivers])

  const canAutoGen = Boolean(startDate) && Boolean(endDate) && Boolean(startTime) && Boolean(endTime)

  // Save
  const handleAutoGenAndSave = async () => {
    if (!canAutoGen) return
    setLoading(true); setError(null); setSuccess(false)

    try {
      const payload: any = {
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
        manualResponsibleId: manualResp || null,
      }

      if (department.toLowerCase() === 'serveis') {
        payload.totalWorkers = serveisData.workers
        payload.numDrivers   = serveisData.drivers
        payload.brigades     = serveisData.brigades
      } else {
        // Construcció de vehicles
        const canonicalType = (t?: string) => {
          const x = (t || '').trim()
          if (!x) return ''
          const hit = (available?.vehicles || []).find(av => av.type?.toLowerCase() === x.toLowerCase())
          return hit?.type || x
        }
        const vehiclesPayload = Array.from({ length: Number(numDrivers || 0) }).map((_, idx) => {
          const v = vehicleAssignments[idx] ?? { vehicleType: '', vehicleId: '', plate: '' }
          if (v.vehicleId) {
            const match = available.vehicles.find(av => av.id === v.vehicleId)
            return {
              id: v.vehicleId,
              plate: match?.plate || '',
              vehicleType: v.vehicleType || match?.type || '',
              conductorId: match?.conductorId || null,
            }
          }
          if (v.vehicleType) {
            return { id: '', plate: '', vehicleType: canonicalType(v.vehicleType), conductorId: null }
          }
          return { id: '', plate: '', vehicleType: '', conductorId: null }
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

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || 'Error desant el quadrant')
      }

      setSuccess(true)
      toast.success('Borrador creat correctament!')
      setTimeout(() => { onOpenChange(false); router.refresh() }, 700)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Hora Inici</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Hora Fi</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
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
              onChange={e => setMeetingPoint(e.target.value)}
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
