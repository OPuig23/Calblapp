// filename: src/app/menu/torns/components/TornFilters.tsx
'use client'

import React, { useState } from 'react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { RotateCcw } from 'lucide-react'
import { startOfWeek, endOfWeek, format } from 'date-fns'

type Props = {
  filters: SmartFiltersChange
  setFilters: (f: Partial<SmartFiltersChange>) => void
  deptOptions?: string[]
  workerOptions?: { id: string; name: string }[]
  role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador'
  sessionDept?: string
  userName?: string
  isAdminOrDireccio?: boolean
  isWorker?: boolean
}

export default function TornFilters({
  filters,
  setFilters,
  deptOptions = [],
  workerOptions = [],
  role,
  sessionDept,
  userName,
  isAdminOrDireccio,
  isWorker,
}: Props) {
  const [resetCounter, setResetCounter] = useState(0)

  const handleChange = (f: SmartFiltersChange) => {
    if (f.start && f.end) {
      setFilters(f)
    }
  }

  const clearAll = () => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    const sunday = endOfWeek(new Date(), { weekStartsOn: 1 })
    const start = format(monday, 'yyyy-MM-dd')
    const end = format(sunday, 'yyyy-MM-dd')
    setFilters({ start, end, workerId: undefined, workerName: undefined, department: undefined })
    setResetCounter(c => c + 1)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      {/* Bloc filtres de dates */}
      <SmartFilters
        role={role}
        departmentOptions={deptOptions}
        workerOptions={workerOptions}
        fixedDepartment={!isAdminOrDireccio ? sessionDept : null}
        lockedWorkerId={isWorker ? undefined : undefined}
        lockedWorkerName={isWorker ? userName : undefined}
        showDepartment={isAdminOrDireccio}
        showStatus={false}
        showImportance={false}
        showLocation={false}
        onChange={handleChange}
        resetSignal={resetCounter}
      />

      {/* Botó reset */}
      <button
        onClick={clearAll}
        className="p-2 h-10 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
      >
        <RotateCcw className="h-5 w-5" />
      </button>
    </div>
  )
}
