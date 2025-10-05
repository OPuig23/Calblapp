// file: src/components/filters/SmartFilters.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CalendarRange, AlertTriangle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '../ui/calendar' // 🔹 Ruta relativa (no '@/') segons la teva config actual
import {
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
  format,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select'

/* ==================== Tipus ==================== */
type Mode = 'week' | 'day' | 'range'
type Role = 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador'
type RoleType = 'treballador' | 'conductor' | 'responsable' | 'all'

export type SmartFiltersChange = {
  mode?: Mode
  start?: string
  end?: string
  department?: string
  workerId?: string
  workerName?: string
  location?: string
  status?: 'all' | 'confirmed' | 'draft'
  importance?: 'Alta' | 'Mitjana' | 'Baixa'
  roleType?: Exclude<RoleType, 'all'>
}

export type WorkerOpt = { id: string; name: string; role?: string; roles?: string[] }

export interface SmartFiltersProps {
  modeDefault?: Mode
  weekOptions?: WeekOpt[]
  departmentOptions?: string[]
  workerOptions?: WorkerOpt[]
  locationOptions?: string[]
  role: Role
  fixedDepartment?: string | null
  lockedWorkerId?: string
  lockedWorkerName?: string
  showDepartment?: boolean
  showWorker?: boolean
  showLocation?: boolean
  showStatus?: boolean
  showImportance?: boolean
  onChange: (f: SmartFiltersChange) => void
  onLabelChange?: (label: string) => void
  statusOptions?: Array<'confirmed' | 'draft'>
  resetSignal?: number
  renderLabels?: {
    roleType?: React.ReactNode
    worker?: React.ReactNode
    department?: React.ReactNode
    location?: React.ReactNode
    status?: React.ReactNode
  }
}

/* ==================== Utils ==================== */
const toIso = (d: Date) => format(d, 'yyyy-MM-dd')
const human = (d: Date) => format(d, 'd MMM yyyy', { locale: es })
const humanSm = (d: Date) => format(d, 'd MMM', { locale: es })
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normDept = (s?: string) => unaccent((s || '').toLowerCase().trim())
const normStr = (s?: string) => unaccent(String(s ?? '').toLowerCase().trim())

const DEPT_LABELS: Record<string, string> = {
  logistica: 'Logística',
  serveis: 'Serveis',
  cuina: 'Cuina',
  transports: 'Transports'
}
const labelDept = (v: string) =>
  DEPT_LABELS[v] || (v ? v[0].toUpperCase() + v.slice(1) : v)

/* ==================== Component ==================== */
export default function SmartFilters({
  modeDefault = 'week',
  departmentOptions = [],
  workerOptions = [],
  locationOptions = [],
  role,
  fixedDepartment = null,
  lockedWorkerId,
  lockedWorkerName,
  showDepartment = true,
  showWorker = true,
  showLocation = true,
  showStatus = true,
  showImportance = false,
  onChange,
  statusOptions = ['confirmed', 'draft'],
  resetSignal,
  renderLabels = {}
}: SmartFiltersProps) {
  const isCap = role === 'Cap Departament'
  const isAdminOrDireccio =
    role?.toLowerCase() === 'admin' ||
    role?.toLowerCase() === 'direccio' ||
    role?.toLowerCase() === 'direccion'

  const allowDepartment = showDepartment && isAdminOrDireccio
  const allowWorker = showWorker && (isCap || isAdminOrDireccio)

  /* ---------- State ---------- */
  const [mode, setMode] = useState<Mode>(modeDefault)
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [dayStr, setDayStr] = useState<string>(toIso(new Date()))
  const [rangeStartStr, setRangeStartStr] = useState<string>('')
  const [rangeEndStr, setRangeEndStr] = useState<string>('')

  const [dept, setDept] = useState<string>(() => normDept(fixedDepartment || ''))
  const [workerId, setWorkerId] = useState<string>(lockedWorkerId || '')
  const [workerName, setWorkerName] = useState<string>(lockedWorkerName || '')
  const [location, setLocation] = useState<string>('')
  const [status, setStatus] = useState<'all' | 'confirmed' | 'draft'>('all')
  const [importance, setImportance] = useState<string | undefined>(undefined)
  const [roleType, setRoleType] = useState<RoleType>('all')
  /* ---------- Refs i efectes per al datepicker nadiu ---------- */
const dayInputRef = useRef<HTMLInputElement | null>(null)
const rangeStartRef = useRef<HTMLInputElement | null>(null)
const rangeEndRef = useRef<HTMLInputElement | null>(null)
const [openRange, setOpenRange] = useState(false)
const [openDay, setOpenDay] = useState(false)

/* Obrir automàticament el calendari quan es selecciona Dia o Rang */
useEffect(() => {
  if (mode === 'day') {
    setTimeout(() => setOpenDay(true), 50)   // petit delay per garantir render
  } else {
    setOpenDay(false)
  }

  if (mode === 'range') {
    setTimeout(() => setOpenRange(true), 50)
  } else {
    setOpenRange(false)
  }
}, [mode])

/* Control del rang: quan s’escull el "des de", salta automàticament al "fins" */
useEffect(() => {
  const timer = setTimeout(() => {
    if (mode === 'range' && rangeStartStr && !rangeEndStr) {
      rangeEndRef.current?.showPicker?.()
      rangeEndRef.current?.focus?.()
    }
  }, 100)
  return () => clearTimeout(timer)
}, [mode, rangeStartStr, rangeEndStr])

/* Si l’usuari cancel·la la selecció o surt del picker → tornar a "Setmana" */
useEffect(() => {
  const handleBlur = () => {
    if (
      (mode === 'day' && !dayStr) ||
      (mode === 'range' && (!rangeStartStr || !rangeEndStr))
    ) {
      setMode('week')
      setAnchor(new Date())
      setDayStr(toIso(new Date()))
      setRangeStartStr('')
      setRangeEndStr('')
    }
  }

  dayInputRef.current?.addEventListener('blur', handleBlur)
  rangeEndRef.current?.addEventListener('blur', handleBlur)
  rangeStartRef.current?.addEventListener('blur', handleBlur)

  return () => {
    dayInputRef.current?.removeEventListener('blur', handleBlur)
    rangeEndRef.current?.removeEventListener('blur', handleBlur)
    rangeStartRef.current?.removeEventListener('blur', handleBlur)
  }
}, [mode, dayStr, rangeStartStr, rangeEndStr])



  /* ---------- Filtres derivats ---------- */
  const filteredWorkerOptions = useMemo(() => {
    if (!allowWorker) return []
    if (roleType === 'all') return workerOptions
    const matchesRole = (w: WorkerOpt) => {
      if (Array.isArray(w.roles)) return w.roles.some((r) => normStr(r) === normStr(roleType))
      if (w.role) return normStr(w.role) === normStr(roleType)
      return true
    }
    return workerOptions.filter(matchesRole)
  }, [workerOptions, roleType, allowWorker])

  /* ---------- Dates ---------- */
  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekLabel = useMemo(
  () => `${format(weekStart, 'd MMM', { locale: es })} – ${format(weekEnd, 'd MMM', { locale: es })}`,
  [weekStart, weekEnd]
)


  const headerLabel = useMemo(() => {
    if (mode === 'week') return weekLabel
    if (mode === 'day') {
      const d = parseISO(dayStr)
      return isValid(d) ? human(d) : 'Selecciona una data'
    }
    const s = parseISO(rangeStartStr)
    const e = parseISO(rangeEndStr)
    if (isValid(s) && isValid(e)) {
      const [a, b] = s <= e ? [s, e] : [e, s]
      return `${human(a)} – ${human(b)}`
    }
    return 'Selecciona un rang de dates'
  }, [mode, weekLabel, dayStr, rangeStartStr, rangeEndStr])

  const prev = () => {
    if (mode === 'week') setAnchor((p) => subWeeks(p, 1))
    if (mode === 'day') setDayStr(toIso(subDays(parseISO(dayStr), 1)))
  }
  const next = () => {
    if (mode === 'week') setAnchor((p) => addWeeks(p, 1))
    if (mode === 'day') setDayStr(toIso(addDays(parseISO(dayStr), 1)))
  }

  /* ---------- Effect de sincronització ---------- */
  const lastPayloadRef = useRef<string>('')

  useEffect(() => {
    let start: string | undefined
    let end: string | undefined

    if (mode === 'week') {
      start = toIso(weekStart)
      end = toIso(weekEnd)
    } else if (mode === 'day') {
      const d = parseISO(dayStr)
      if (isValid(d)) {
        start = toIso(d)
        end = toIso(d)
      }
    } else if (mode === 'range' && rangeStartStr && rangeEndStr) {
      const s = parseISO(rangeStartStr)
      const e = parseISO(rangeEndStr)
      if (isValid(s) && isValid(e)) {
        const [a, b] = s <= e ? [s, e] : [e, s]
        start = toIso(a)
        end = toIso(b)
      }
    }

    const payload: SmartFiltersChange = {
      mode,
      start,
      end,
      department: allowDepartment ? (dept || undefined) : undefined,
      workerId: allowWorker && workerId ? workerId : undefined,
      workerName: allowWorker && workerName ? workerName : undefined,
      location: showLocation && location ? location : undefined,
      status: showStatus ? status : undefined,
      importance: showImportance && importance !== 'all'
        ? (importance as 'Alta' | 'Mitjana' | 'Baixa')
        : undefined,
      roleType: allowWorker && roleType !== 'all'
        ? (roleType as Exclude<RoleType, 'all'>)
        : undefined
    }

    const key = JSON.stringify(payload)
    if (key !== lastPayloadRef.current) {
      lastPayloadRef.current = key
      if (start && end) {
        onChange(payload)
        if (typeof onLabelChange === 'function') onLabelChange(headerLabel)
      }
    }
  }, [
    mode,
    weekStart,
    weekEnd,
    dayStr,
    rangeStartStr,
    rangeEndStr,
    dept,
    workerId,
    workerName,
    location,
    status,
    importance,
    roleType,
    allowDepartment,
    allowWorker,
    showLocation,
    showStatus,
    showImportance,
    onChange
  ])

  useEffect(() => {
    if (resetSignal !== undefined) {
      setMode('week')
      setAnchor(new Date())
      setDayStr(toIso(new Date()))
      setRangeStartStr('')
      setRangeEndStr('')
      setRoleType('all')
    }
  }, [resetSignal])

  /* ==================== RENDER ==================== */
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap gap-2 w-full">
      {/* 🔹 Barra superior del filtre de dates – una sola línia, amb selector únic i rang automàtic */}
<div className="flex items-center justify-between w-full gap-1.5 py-1.5 px-1.5 overflow-x-hidden whitespace-nowrap">


{/* 🔹 Navegació compacta amb fletxes (mostra en Setmana i Dia, amaga en Rang) */}
{mode !== 'range' && (
  <div className="flex items-center gap-1 shrink-0">
    <Button
      size="icon"
      variant="ghost"
      onClick={prev}
      className="h-7 w-7 text-gray-600"
    >
      ◀
    </Button>

    {mode === 'week' && (
      <span className="text-[13px] font-medium whitespace-nowrap px-0.5">
        {weekLabel.replace(/ 20\d{2}/g, '')}
      </span>
    )}

    {mode === 'day' && (
      <span className="text-[13px] font-medium whitespace-nowrap px-0.5">
        {format(parseISO(dayStr), 'd MMM yyyy', { locale: es })}
      </span>
    )}

    <Button
      size="icon"
      variant="ghost"
      onClick={next}
      className="h-7 w-7 text-gray-600"
    >
      ▶
    </Button>
  </div>
)}


  {/* 🗓️ Zona del label i inputs */}
  <div className="flex items-center gap-2 shrink-0">
   
{mode === 'day' && (
  <Popover open={openDay} onOpenChange={setOpenDay}>
    <PopoverTrigger asChild>
  <div onClick={() => setOpenDay(true)} />
</PopoverTrigger>

    <PopoverContent className="p-3 w-auto flex flex-col gap-2 items-center">
      <Calendar
        mode="single"
        selected={parseISO(dayStr)}
        onSelect={(d) => {
          if (d) setDayStr(format(d, 'yyyy-MM-dd'))
        }}
      />
      <div className="flex justify-end gap-2 w-full mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => {
            setOpenDay(false)
            setMode('week')
            setAnchor(new Date())
          }}
        >
          Cancel·la
        </Button>
        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
          disabled={!dayStr}
          onClick={() => {
            setOpenDay(false)
            setAnchor(parseISO(dayStr))
          }}
        >
          Aplica
        </Button>
      </div>
    </PopoverContent>
  </Popover>
)}

    {mode === 'range' && (
  <Popover open={openRange} onOpenChange={setOpenRange}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-sm whitespace-nowrap"
        onClick={() => setOpenRange(true)}
      >
        {rangeStartStr && rangeEndStr
          ? `${format(parseISO(rangeStartStr), 'd MMM', { locale: es })} – ${format(parseISO(rangeEndStr), 'd MMM', { locale: es })}`
          : 'Selecciona un rang de dates'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="p-3 w-auto flex flex-col gap-2 items-center">
      <Calendar
        mode="range"
        selected={
          rangeStartStr && rangeEndStr
            ? { from: parseISO(rangeStartStr), to: parseISO(rangeEndStr) }
            : undefined
        }
        onSelect={(r) => {
          if (r?.from) setRangeStartStr(format(r.from, 'yyyy-MM-dd'))
          if (r?.to) setRangeEndStr(format(r.to, 'yyyy-MM-dd'))
        }}
      />
      <div className="flex justify-end gap-2 w-full mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => {
            setOpenRange(false)
            setMode('week')
            setAnchor(new Date())
            setRangeStartStr('')
            setRangeEndStr('')
          }}
        >
          Cancel·la
        </Button>
        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
          disabled={!rangeStartStr || !rangeEndStr}
          onClick={() => {
            if (rangeStartStr && rangeEndStr) {
              setOpenRange(false) // 🔹 tanquem el popover
              setAnchor(parseISO(rangeStartStr))
            }
          }}
        >
          Aplica
        </Button>
      </div>
    </PopoverContent>
  </Popover>
)}

  </div>

  {/* 🔘 Botó únic amb Popover horitzontal per seleccionar Setmana / Dia / Rang */}
<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="h-9 px-4 rounded-lg border bg-white text-gray-900 flex items-center gap-1"
    >
      {mode === 'week' ? 'Setmana' : mode === 'day' ? 'Dia' : 'Rang'}
      <span className="text-gray-500 text-xs">▼</span>
    </Button>
  </PopoverTrigger>

  <PopoverContent
    side="bottom"
    align="center"
    className="p-1 w-auto rounded-xl border bg-white shadow-md flex gap-1"
  >
    {(['week', 'day', 'range'] as Mode[]).map((opt) => (
      <Button
        key={opt}
        size="sm"
        variant={mode === opt ? 'secondary' : 'ghost'}
        className="px-3"
        onClick={() => {
          setMode(opt)
          // 🔹 Reiniciem estats segons el mode
          if (opt === 'week') {
            setAnchor(new Date())
            setDayStr(toIso(new Date()))
            setRangeStartStr('')
            setRangeEndStr('')
          }
          if (opt === 'day') {
            setRangeStartStr('')
            setRangeEndStr('')
          }
          if (opt === 'range') {
            setDayStr(toIso(new Date()))
          }
        }}
      >
        {opt === 'week' ? 'Setmana' : opt === 'day' ? 'Dia' : 'Rang'}
      </Button>
    ))}
  </PopoverContent>
</Popover>

</div> {/* ✅ Tanca la barra superior de filtres */}


{/* 🔽 Selects opcionals (es mostren només si cal) */}
<div className="flex flex-wrap gap-2">
  {allowWorker && (
    <Select value={roleType} onValueChange={(v) => setRoleType(v as RoleType)}>
      <SelectTrigger className="w-[180px] border bg-white text-gray-900">
        <SelectValue placeholder="Rol">
          {renderLabels.roleType || 'Rol'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">🌐 Tots</SelectItem>
        <SelectItem value="treballador">Treballador</SelectItem>
        <SelectItem value="conductor">Conductor</SelectItem>
        <SelectItem value="responsable">Responsable</SelectItem>
      </SelectContent>
    </Select>
  )}

        {showStatus && (
          <Select value={status} onValueChange={(v) => setStatus(v as 'all' | 'confirmed' | 'draft')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots</SelectItem>
              {statusOptions.includes('confirmed') && <SelectItem value="confirmed">✅ Confirmats</SelectItem>}
              {statusOptions.includes('draft') && <SelectItem value="draft">📝 Borrador</SelectItem>}
            </SelectContent>
          </Select>
        )}

        {allowDepartment && departmentOptions.length > 0 && (
          <Select value={dept || 'tots'} onValueChange={(v) => setDept(v === 'tots' ? '' : v)}>
            <SelectTrigger className="w-[180px] border bg-white text-gray-900">
              <SelectValue placeholder="Departament">{renderLabels.department || 'Departament'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tots">🌐 Tots els departaments</SelectItem>
              {departmentOptions.map((dep, i) => (
                <SelectItem key={`${dep}-${i}`} value={dep}>
                  {labelDept(dep)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {allowWorker && filteredWorkerOptions.length > 0 && (
          <Select
            value={workerId || workerName || '__all__'}
            onValueChange={(v) => {
              if (v === '__all__') {
                setWorkerId('')
                setWorkerName('')
                return
              }
              const sel = filteredWorkerOptions.find((w) => w.id === v || w.name === v)
              setWorkerId(sel?.id || '')
              setWorkerName(sel?.name || v)
            }}
          >
            <SelectTrigger className="w-[180px] border bg-white text-gray-900">
              <SelectValue placeholder="Treballador">
                {workerId || workerName
                  ? filteredWorkerOptions.find((w) => w.id === workerId || w.name === workerName)?.name
                  : renderLabels.worker || '🌐 Tots'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Tots</SelectItem>
              {filteredWorkerOptions.map((w, i) => (
                <SelectItem key={`${w.id || w.name}-${i}`} value={w.id || w.name}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showLocation && locationOptions.length > 0 && (
          <Select value={location || ''} onValueChange={(v) => setLocation(v)}>
            <SelectTrigger className="w-[180px] border bg-white text-gray-900">
              <SelectValue placeholder="Ubicació">{renderLabels.location || 'Ubicació'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((loc, i) => (
                <SelectItem key={`${loc}-${i}`} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showImportance && (
          <Select value={importance} onValueChange={(v) => setImportance(v)}>
            <SelectTrigger className="w-[150px] border bg-white text-gray-900">
              <SelectValue
                placeholder={
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Importància
                  </span>
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 Totes</SelectItem>
              <SelectItem value="Alta">🔴 Alta</SelectItem>
              <SelectItem value="Mitjana">🟠 Mitjana</SelectItem>
              <SelectItem value="Baixa">🔵 Baixa</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
