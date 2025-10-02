// file: src/components/filters/SmartFilters.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarRange, AlertTriangle } from 'lucide-react'

import {
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
  format,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

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
export type WeekOpt = { label: string; start: string; end: string }

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
  transports: 'Transports',
}
const labelDept = (v: string) =>
  DEPT_LABELS[v] || (v ? v[0].toUpperCase() + v.slice(1) : v)

export default function SmartFilters({
  modeDefault = 'week',
  weekOptions = [],
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
  renderLabels = {},
}: SmartFiltersProps) {
  const isCap = role === 'Cap Departament'
  const isAdminOrDireccio =
    role?.toLowerCase() === 'admin' ||
    role?.toLowerCase() === 'direccio' ||
    role?.toLowerCase() === 'direccion'

  const allowDepartment = showDepartment && isAdminOrDireccio
  const allowWorker = showWorker && (isCap || isAdminOrDireccio)

  // 📌 State
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

  const filteredWorkerOptions = useMemo(() => {
    if (!allowWorker) return []
    if (roleType === 'all') return workerOptions

    const hasRoleInfo = workerOptions.some((w) => 'role' in w || 'roles' in w)
    if (!hasRoleInfo) return workerOptions

    const matchesRole = (w: WorkerOpt) => {
      if (Array.isArray(w.roles)) return w.roles.some((r) => normStr(r) === normStr(roleType))
      if (w.role) return normStr(w.role) === normStr(roleType)
      return true
    }

    return workerOptions.filter(matchesRole)
  }, [workerOptions, roleType, allowWorker])

  // 📅 Dates
  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor])
  const weekLabel = useMemo(() => `${humanSm(weekStart)} – ${human(weekEnd)}`, [weekStart, weekEnd])

  const headerLabel = useMemo(() => {
    if (mode === 'week') return weekLabel
    if (mode === 'day') {
      const d = parseISO(dayStr)
      return isValid(d) ? human(d) : 'Selecciona una data'
    }
    const s = parseISO(rangeStartStr),
      e = parseISO(rangeEndStr)
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
      importance: showImportance && importance !== 'all' ? (importance as 'Alta' | 'Mitjana' | 'Baixa') : undefined,
      roleType: allowWorker && roleType !== 'all' ? (roleType as Exclude<RoleType, 'all'>) : undefined,
    }

    const key = JSON.stringify(payload)
    if (key !== lastPayloadRef.current) {
      lastPayloadRef.current = key
      if (start && end) onChange(payload)
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
    onChange,
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

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 overflow-x-auto">
      {/* 📅 Bloc Data */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <Button size="sm" variant="ghost" onClick={prev}>
            ◀
          </Button>
          <CalendarRange className="h-5 w-5 text-blue-600" aria-hidden />
          <Button size="sm" variant="ghost" onClick={next}>
            ▶
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'range' ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <Input type="date" value={rangeStartStr} onChange={(e) => setRangeStartStr(e.target.value)} className="flex-1 rounded-xl border px-2 py-1 text-sm" />
              <span className="hidden sm:inline text-gray-500">–</span>
              <Input type="date" value={rangeEndStr} onChange={(e) => setRangeEndStr(e.target.value)} className="flex-1 rounded-xl border px-2 py-1 text-sm" />
            </div>
          ) : (
            <motion.span
              key={headerLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="text-sm font-semibold"
            >
              {headerLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* 🔘 Botons mode */}
      <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm">
        <Button size="sm" variant={mode === 'week' ? 'secondary' : 'ghost'} onClick={() => setMode('week')}>
          Setmana
        </Button>
        <Button size="sm" variant={mode === 'day' ? 'secondary' : 'ghost'} onClick={() => setMode('day')}>
          Dia
        </Button>
        <Button
          size="sm"
          variant={mode === 'range' ? 'secondary' : 'ghost'}
          onClick={() => {
            setMode('range')
            setRangeStartStr('')
            setRangeEndStr('')
          }}
        >
          Rang
        </Button>
      </div>

      {/* 🔽 Select Rol */}
      {allowWorker && (
        <div className="flex items-center gap-2">
          <Select value={roleType} onValueChange={(v) => setRoleType(v as RoleType)}>
            <SelectTrigger className="w-[180px] border bg-white text-gray-900">
              <SelectValue placeholder="Rol">{renderLabels.roleType || 'Rol'}</SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">🌐 Tots</SelectItem>
              <SelectItem value="treballador">Treballador</SelectItem>
              <SelectItem value="conductor">Conductor</SelectItem>
              <SelectItem value="responsable">Responsable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 🔽 Select Estat */}
      {showStatus && (
        <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* 🔽 Select Departament */}
      {allowDepartment && departmentOptions.length > 0 && (
        <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* 🔽 Select Worker */}
      {allowWorker && filteredWorkerOptions.length > 0 && (
        <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* 🔽 Select Location */}
      {showLocation && locationOptions.length > 0 && (
        <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* 🔽 Select Importància */}
      {showImportance && (
        <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  )
}
