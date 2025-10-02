// filename: src/app/menu/torns/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { TornNotificationsList } from '@/components/torns/TornNotificationsList'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import TornsList from './components/TornsList'
import { CalendarDays, RotateCcw, SlidersHorizontal } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import TornDetailModal from './components/TornDetailModal'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type ApiWorker = {
  id?: string
  name?: string
  role?: string
  startTime?: string
  endTime?: string
  meetingPoint?: string
  department?: string
  finalDept?: string
}

type ApiTorn = {
  id: string
  code: string
  eventName: string
  date: string
  time?: string
  department?: string
  workerRole?: 'responsable' | 'conductor' | 'treballador' | null
  meetingPoint?: string
  location?: string
  __rawWorkers?: ApiWorker[]
}

type ApiResp = { 
  ok: boolean
  data: ApiTorn[]
  meta?: {
    departments: string[]
    workers: { id?: string; name: string }[]
  }
}

const norm = (s?: string | null) =>
  String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// Helpers dates locals
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const getCurrentWeekRange = () => {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow - 1))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { start: toLocalISODate(monday), end: toLocalISODate(sunday) }
}

export default function TornsPage() {
  const { data: session, status } = useSession()

  const [items, setItems] = useState<ApiTorn[]>([])
  const [deptOptions, setDeptOptions] = useState<string[]>([])
  const [workerOptions, setWorkerOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estat modal
  const [selectedTorn, setSelectedTorn] = useState<ApiTorn | null>(null)
  const [detail, setDetail] = useState<ApiTorn | null>(null)

  const userName = session?.user?.name || ''
  const rawRole = norm(session?.user?.role)
  const role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' =
    rawRole?.startsWith('admin') ? 'Admin'
    : rawRole?.includes('dire') ? 'Direcció'
    : rawRole?.includes('cap') ? 'Cap Departament'
    : 'Treballador'

  const sessionDept = norm(session?.user?.department)
  const isAdminOrDireccio = role === 'Admin' || role === 'Direcció'
  const isWorker = role === 'Treballador'

  // Inicialització setmana actual
  const defaultWeek = getCurrentWeekRange()
  const [filters, setFilters] = useState<SmartFiltersChange>({
    mode: 'week',
    start: defaultWeek.start,
    end: defaultWeek.end,
  })

  // Fetch API → llista bàsica de torns
  useEffect(() => {
    if (status !== 'authenticated') return
    if (!filters.start || !filters.end) return
    const controller = new AbortController()

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('mode', filters.mode || 'week')
        params.set('start', filters.start!)
        params.set('end', filters.end!)

        if (filters.department && filters.department !== 'tots') {
          params.set('department', filters.department)
        }
        if (filters.workerId) params.set('workerId', filters.workerId)
        if (filters.workerName) params.set('workerName', filters.workerName) 
        if (filters.roleType) params.set('roleType', filters.roleType)   

        console.log('[TornsPage] Fetch params', Object.fromEntries(params.entries()))
        const res = await fetch(`/api/torns/getTorns?${params.toString()}`, {
          signal: controller.signal,
        })
        const json = (await res.json()) as ApiResp

        if (!json.ok) {
          setItems([])
          setDeptOptions([])
          setWorkerOptions([])
          setError('Error carregant torns')
          return
        }

        setItems(json.data || [])
        const depts = json.meta?.departments || []
        setDeptOptions(isAdminOrDireccio ? ['tots', ...depts] : depts)
        setWorkerOptions(json.meta?.workers || [])
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.log('[TornsPage] Fetch abortat (canvi de filtres o desmontatge)')
          return
        }
        setError('Error de connexió')
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [filters, status, isAdminOrDireccio])

  // ✅ Obre detall torn
  const openTornDetail = (t: ApiTorn) => {
    setSelectedTorn(t)

    const enrichedWorkers: ApiWorker[] = (t.__rawWorkers || []).map((w) => ({
      ...w,
      department: w.finalDept || w.department || 'Sense departament',
    }))

    setDetail({
      ...t,
      __rawWorkers: enrichedWorkers,
    })
  }

  const closeDetail = () => {
    setSelectedTorn(null)
    setDetail(null)
  }

  if (status === 'loading') return <p className="p-6">Carregant sessió…</p>

  return (
    <div className="p-4">
      <ModuleHeader
        icon={<CalendarDays className="w-7 h-7 text-blue-600" />}
        title="Torns Assignats"
        subtitle="Consulta i gestiona els torns assignats"
      />

      <TornNotificationsList />

      {/* Barra de filtres estil FilterBar */}
      <div className="w-full px-3 py-2 sm:px-4 sm:py-3 mb-6">
        <div className="w-full">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex flex-wrap items-center gap-3">
            <SmartFilters
              modeDefault="week"
              role={role}
              departmentOptions={deptOptions}
              workerOptions={workerOptions}
              fixedDepartment={!isAdminOrDireccio ? sessionDept : null}
              lockedWorkerName={isWorker ? userName : undefined}
              showDepartment={isAdminOrDireccio}
              showStatus={false}
              onChange={setFilters}
            />

            {/* 🔘 Reset compacte */}
            <div className="flex-1 sm:flex-none min-w-[50px]">
              <button
                onClick={() => {
                  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
                  const sunday = endOfWeek(new Date(), { weekStartsOn: 1 })
                  setFilters({
                    start: format(monday, 'yyyy-MM-dd'),
                    end: format(sunday, 'yyyy-MM-dd'),
                    mode: 'week',
                  })
                }}
                className="w-full sm:w-auto p-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition flex items-center justify-center"
                title="Reset"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            {/* 🔘 Botó més filtres compacte */}
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
                  {/* 🔽 Select Rol → NOMÉS aquí dins */}
                  <select
                    className="h-10 rounded-xl border bg-white text-gray-900 px-2"
                    value={filters.roleType || 'all'}
                    onChange={(e) => setFilters({ roleType: e.target.value })}
                  >
                    <option value="all">🌐 Tots</option>
                    <option value="treballador">Treballador</option>
                    <option value="conductor">Conductor</option>
                    <option value="responsable">Responsable</option>
                  </select>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Llistat */}
      {loading ? (
        <p className="text-center py-10">Carregant torns…</p>
      ) : error ? (
        <p className="text-center py-10 text-red-500">{error}</p>
      ) : (
        <TornsList
          items={items}
          onTornClick={openTornDetail}
          groupByEvent={!isWorker && !filters.workerId && !filters.workerName}
          role={role}
        />
      )}

      {/* Modal detall */}
      <TornDetailModal
        open={!!selectedTorn}
        onClose={closeDetail}
        torn={detail || selectedTorn}
      />
    </div>
  )
}
