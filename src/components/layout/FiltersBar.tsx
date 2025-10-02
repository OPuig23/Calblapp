// file: src/components/layout/FiltersBar.tsx
'use client'

import { useState } from 'react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/* ================= Types ================= */
export type FiltersState = {
  start: string
  end: string
  mode?: 'week' | 'day' | 'range'
  department?: string
  workerId?: string
  workerName?: string
  roleType?: 'responsable' | 'conductor' | 'treballador'
  ln?: string
  responsable?: string
  location?: string
  status?: 'pending' | 'confirmed' | 'draft' | 'closed'
  importance?: 'Alta' | 'Mitjana' | 'Baixa'
}

type FilterKey =
  | 'ln'
  | 'department'
  | 'worker'
  | 'responsable'
  | 'location'
  | 'status'
  | 'importance'
  | 'role'

export type FiltersBarProps = {
  filters: FiltersState
  setFilters: (f: Partial<FiltersState>) => void
  onReset?: () => void
  visibleFilters?: FilterKey[]
  hiddenFilters?: FilterKey[]
  lnOptions?: string[]
  responsables?: string[]
  locations?: string[]
  statusOptions?: Array<'pending' | 'confirmed' | 'draft' | 'closed'>
  departmentOptions?: string[]
  workerOptions?: { id: string; name: string; roles?: string[]; department?: string; ln?: string; location?: string }[]
}

/* ================= Component ================= */
export default function FiltersBar({
  filters,
  setFilters,
  onReset,
  visibleFilters = [],
  hiddenFilters = [],
  lnOptions = [],
  responsables = [],
  locations = [],
  statusOptions = ['pending', 'confirmed', 'draft', 'closed'],
  departmentOptions = [],
  workerOptions = [],
}: FiltersBarProps) {
  const [resetCounter, setResetCounter] = useState(0)

  /* Reset global */
  const clearAll = () => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    const sunday = endOfWeek(new Date(), { weekStartsOn: 1 })
    const start = format(monday, 'yyyy-MM-dd')
    const end = format(sunday, 'yyyy-MM-dd')

    setFilters({
      start,
      end,
      ln: '__all__',
      responsable: '__all__',
      location: '__all__',
      status: undefined,
      importance: undefined,
    })
    setResetCounter((c) => c + 1)
    if (onReset) onReset()
  }

  /* Render helper per cada filtre */
  const renderSelect = (key: FilterKey) => {
    const baseClass =
      'h-10 rounded-xl border bg-white text-gray-900 flex items-center gap-2 min-w-[160px]'

    switch (key) {
      case 'ln':
        return (
          <Select
            value={filters.ln || '__all__'}
            onValueChange={(val) => setFilters({ ln: val })}
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">🌐 LN:</span>
              <SelectValue placeholder="Totes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Totes les LN</SelectItem>
              {(lnOptions.length
                ? lnOptions
                : ['Empresa', 'Casaments', 'Foodlovers', 'Agenda', 'Altres']
              ).map((ln) => (
                <SelectItem key={ln} value={ln}>
                  {ln}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'department':
        return (
          <Select
            value={filters.department || '__all__'}
            onValueChange={(val) =>
              setFilters({ department: val === '__all__' ? undefined : val })
            }
          >
            <SelectTrigger className="w-full rounded-xl border bg-white text-gray-900">
              <SelectValue placeholder="Departament" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Tots els departaments</SelectItem>
              {departmentOptions.map((dep) => (
                <SelectItem key={dep} value={dep}>
                  {dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'worker':
        return (
          <Select
            value={filters.workerId || '__all__'}
            onValueChange={(val) => {
              if (val === '__all__') {
                setFilters({ workerId: undefined, workerName: undefined })
              } else {
                const sel = workerOptions.find((w) => w.id === val)
                setFilters({
                  workerId: sel?.id,
                  workerName: sel?.name,
                })
              }
            }}
          >
            <SelectTrigger className="w-full rounded-xl border bg-white text-gray-900">
              <SelectValue placeholder="Treballador">
                {filters.workerId
                  ? workerOptions.find((w) => w.id === filters.workerId)?.name
                  : '🌐 Tots'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Tots</SelectItem>
              {workerOptions.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'responsable':
        return (
          <Select
            value={filters.responsable || '__all__'}
            onValueChange={(val) => setFilters({ responsable: val })}
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">👤 Resp:</span>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Tots</SelectItem>
              {responsables.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'location':
        return (
          <Select
            value={filters.location || '__all__'}
            onValueChange={(val) => setFilters({ location: val })}
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">📍 Ubic:</span>
              <SelectValue placeholder="Totes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">🌐 Totes</SelectItem>
              {locations.map((loc) => {
                const short = loc.split(/[,\|\.]/)[0]?.trim() || loc.trim()
                const display = short.length > 30 ? short.slice(0, 30) + '…' : short
                return (
                  <SelectItem key={loc} value={short}>
                    {display}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )

      case 'status':
        return (
          <Select
            value={filters.status || 'all'}
            onValueChange={(val) =>
              setFilters({ status: val as FiltersState['status'] })
            }
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">📊 Estat:</span>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 Tots</SelectItem>
              {statusOptions.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'importance':
        return (
          <Select
            value={filters.importance || 'all'}
            onValueChange={(val) =>
              setFilters({ importance: val as FiltersState['importance'] })
            }
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">⚡ Import.:</span>
              <SelectValue placeholder="Totes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 Totes</SelectItem>
              <SelectItem value="Alta">🔴 Alta</SelectItem>
              <SelectItem value="Mitjana">🟠 Mitjana</SelectItem>
              <SelectItem value="Baixa">🔵 Baixa</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'role':
        return (
          <Select
            value={filters.roleType || 'all'}
            onValueChange={(val) =>
              setFilters({ roleType: val as FiltersState['roleType'] })
            }
          >
            <SelectTrigger className={baseClass}>
              <span className="text-gray-500 text-sm">🧑 Rol:</span>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 Tots</SelectItem>
              <SelectItem value="treballador">Treballador</SelectItem>
              <SelectItem value="conductor">Conductor</SelectItem>
              <SelectItem value="responsable">Responsable</SelectItem>
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  /* ================= Render ================= */
  return (
    <div className="w-full px-3 py-2 sm:px-4 sm:py-3">
      <div className="w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-wrap items-center gap-3">
          {/* 📅 Dates */}
          <SmartFilters
            modeDefault="week"
            role="Treballador"
            showDepartment={false}
            showWorker={false}
            showLocation={false}
            showStatus={false}
            onChange={(f: SmartFiltersChange) => {
              if (f.start && f.end) {
                setFilters({ start: f.start, end: f.end, mode: f.mode })
              }
            }}
            resetSignal={resetCounter}
          />

          {/* 🔘 Filtres visibles */}
          {visibleFilters.map((key) => (
            <div key={key}>{renderSelect(key)}</div>
          ))}

          {/* 🔘 Reset compacte */}
          <div className="flex-1 sm:flex-none min-w-[50px]">
            <button
              onClick={clearAll}
              className="w-full sm:w-auto p-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition flex items-center justify-center"
              title="Reset"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {/* 🔘 Botó més filtres compacte */}
          {hiddenFilters.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="px-2 py-2 rounded-xl border text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                  title="Filtres addicionals"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filtres addicionals</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-3">
                  {hiddenFilters.map((key) => (
                    <div key={key}>{renderSelect(key)}</div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
