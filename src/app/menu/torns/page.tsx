// filename: src/app/menu/torns/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { CalendarDays } from 'lucide-react'
import { TornNotificationsList } from '@/components/torns/TornNotificationsList'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import TornsList from './components/TornsList'
import TornDetailModal from './components/TornDetailModal'
import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'
import TornFilters from './components/TornFilters'
import { format, startOfWeek, endOfWeek } from 'date-fns'

type ApiWorker = { id?: string; name?: string }
type ApiTorn = {
  id: string
  code: string
  eventName: string
  date: string
  __rawWorkers?: ApiWorker[]
}

type ApiResp = {
  ok: boolean
  data: ApiTorn[]
  meta?: {
    departments?: string[]
    workers?: { id?: string; name: string }[]
  }
}

const norm = (s?: string | null) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export default function TornsPage() {
  const { data: session, status } = useSession()

  const [items, setItems] = useState<ApiTorn[]>([])
  const [deptOptions, setDeptOptions] = useState<string[]>([])
  const [workerOptions, setWorkerOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedTorn, setSelectedTorn] = useState<ApiTorn | null>(null)
  const [detail, setDetail] = useState<ApiTorn | null>(null)

  const userName = session?.user?.name || ''
  const rawRole = norm(session?.user?.role)
  const sessionDept = norm(session?.user?.department)

  const role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' =
    rawRole.startsWith('admin')
      ? 'Admin'
      : rawRole.includes('dire')
      ? 'Direcció'
      : rawRole.includes('cap')
      ? 'Cap Departament'
      : 'Treballador'

  const isAdminOrDireccio = role === 'Admin' || role === 'Direcció'
  const isWorker = role === 'Treballador'

  // ============================
  // 📅 Dates per defecte
  // ============================
  const today = new Date()
  const defaultStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const defaultEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [filters, setFilters] = useState<SmartFiltersChange>({
    mode: 'week',
    start: defaultStart,
    end: defaultEnd,
    roleType: 'all' as any,
  })

  // ============================
  // 🟦 CONTEXT SLIDE FILTERS
  // ============================
  const { setOpen, setContent } = useFilters()

  // ============================
  // 🔵 FETCH TURNS
  // ============================
  useEffect(() => {
    if (status !== 'authenticated') return

    // ❗ No fer fetch fins tenir dates correctes
    if (
      !filters.start ||
      !filters.end ||
      filters.start.length !== 10 ||
      filters.end.length !== 10
    ) {
      return
    }

    const controller = new AbortController()

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('mode', filters.mode || 'week')
        params.set('start', filters.start!)
        params.set('end', filters.end!)

        if (filters.roleType) params.set('roleType', filters.roleType)
        if (filters.workerId) params.set('workerId', filters.workerId)
        if (filters.workerName) params.set('workerName', filters.workerName)
        if (filters.department) params.set('department', filters.department)

        const res = await fetch(`/api/torns/getTorns?${params}`, {
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

        const rawWorkers = Array.isArray(json.meta?.workers)
          ? json.meta.workers
          : []
        const workers = rawWorkers.map((w) => ({
          id: w.id || '',
          name: w.name || '',
        }))
        setWorkerOptions(workers)
      } catch {
        setError('Error de connexió')
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [filters, isAdminOrDireccio, status])

  // ============================
  // DETALL
  // ============================
  const openDetail = (t: ApiTorn) => {
    setSelectedTorn(t)
    setDetail(t)
  }

  const closeDetail = () => {
    setSelectedTorn(null)
    setDetail(null)
  }

  if (status === 'loading') return <p className="p-6">Carregant sessió…</p>

  // ============================
  // RENDER
  // ============================
  return (
    <div className="p-4">
      <ModuleHeader
        icon={<CalendarDays className="w-7 h-7 text-blue-600" />}
        title="Torns Assignats"
        subtitle="Consulta i gestiona els torns assignats"
      />

      <TornNotificationsList />

      {/* SMART FILTERS */}
      <div className="w-full px-3 py-2 sm:px-4 sm:py-3 mb-6">
<div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex items-center justify-between">
  
  {/* Bloc esquerra: SmartFilters */}
  <div className="flex items-center gap-3">
    <SmartFilters
      modeDefault="week"
      role={role}
      departmentOptions={deptOptions}
      workerOptions={workerOptions}
      fixedDepartment={!isAdminOrDireccio ? sessionDept : null}
      lockedWorkerName={isWorker ? userName : undefined}
      showDepartment={false}
      showStatus={false}
      showLocation={false}
      showWorker={false}
      showImportance={false}
      onChange={(f) => setFilters(f)}
    />
  </div>

  {/* Bloc dreta: Botó filtres avançats */}
  <FilterButton
  onClick={() => {
    setContent(
      <TornFilters
        setFilters={setFilters}
        deptOptions={deptOptions}
        workerOptions={workerOptions}
        role={role}
        sessionDept={sessionDept}
        userName={userName}
        isAdminOrDireccio={isAdminOrDireccio}
        isWorker={isWorker}
      />
    )
  }}
/>

</div>

      </div>



      {/* LLISTAT */}
      {loading ? (
        <p className="text-center py-10">Carregant torns…</p>
      ) : error && filters.start && filters.end ? (
        <p className="text-center py-10 text-red-500">{error}</p>
      ) : items.length === 0 && filters.start && filters.end ? (
        <p className="text-center py-10 text-gray-500">
          No hi ha torns assignats en aquest període
        </p>
      ) : (
        <TornsList
          items={items}
          onTornClick={openDetail}
          groupByEvent={
            !isWorker && !(filters.workerId) && !(filters.workerName)
          }
          role={role}
        />
      )}

      {/* MODAL DETALL */}
      <TornDetailModal
        open={!!selectedTorn}
        onClose={closeDetail}
        torn={detail || selectedTorn}
      />
    </div>
  )
}
