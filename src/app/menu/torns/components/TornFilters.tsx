// filename: src/app/menu/torns/components/TornFilters.tsx
'use client'

import React, { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { startOfWeek, endOfWeek, format } from 'date-fns'

type Props = {
  setFilters: (f: any) => void
  deptOptions?: string[]
  workerOptions?: { id: string; name: string }[]
  role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador'
  sessionDept?: string
  userName?: string
  isAdminOrDireccio?: boolean
  isWorker?: boolean
}

export default function TornFilters({
  setFilters,
  deptOptions = [],
  workerOptions = [],
  role,
  sessionDept,
  userName,
  isAdminOrDireccio,
  isWorker,
}: Props) {

  const [localRoleType, setLocalRoleType] = useState('all')
  const [localDepartment, setLocalDepartment] = useState(
    isAdminOrDireccio ? '' : sessionDept || ''
  )
  const [localWorker, setLocalWorker] = useState('')

  // ─────────────────────────────────────────────
  // APPLY FILTERS CORRECTE
  // ─────────────────────────────────────────────
  const applyFilters = () => {
    const payload: any = {}

    // ROLE FILTER
    if (localRoleType !== 'all') {
      payload.roleType = localRoleType
    }

    // DEPARTMENT FILTER
    if (isAdminOrDireccio && localDepartment !== '') {
      payload.department = localDepartment
    }

    // WORKER FILTER
    if (localWorker !== '') {
      payload.workerName = localWorker   // <── NOM, no ID inventat
    }

    setFilters(prev => ({
      ...prev,       // NO ENS CARREGUEM EL RANG DE DATES
      ...payload,    // NOMÉS afegim el necessari
    }))
  }

  // ─────────────────────────────────────────────
  // CLEAR ALL COMPLETAMENT SEGUR
  // ─────────────────────────────────────────────
  const clearAll = () => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    const sunday = endOfWeek(new Date(), { weekStartsOn: 1 })

    setLocalRoleType('all')
    setLocalDepartment(isAdminOrDireccio ? '' : sessionDept || '')
    setLocalWorker('')

    setFilters({
      start: format(monday, 'yyyy-MM-dd'),
      end: format(sunday, 'yyyy-MM-dd'),
      // NO ENVIEM CAP FILTRE EXTRA
    })
  }
  const resetFilters = () => {
  setLocalRoleType('all')
  setLocalDepartment(isAdminOrDireccio ? '' : sessionDept || '')
  setLocalWorker('')

  setFilters(prev => ({
    start: prev.start,
    end: prev.end,
    roleType: undefined,
    department: undefined,
    workerName: undefined,
    workerId: undefined,
  }))
}


  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">

      {/* ROLE */}
      {isAdminOrDireccio && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Rol</label>
          <select
            className="border rounded-lg p-2"
            value={localRoleType}
            onChange={(e) => setLocalRoleType(e.target.value)}
          >
            <option value="all">Tots</option>
            <option value="treballador">Treballador</option>
            <option value="conductor">Conductor</option>
            <option value="responsable">Responsable</option>
          </select>
        </div>
      )}

      {/* DEPARTAMENT */}
      {isAdminOrDireccio && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Departament</label>
          <select
            className="border rounded-lg p-2"
            value={localDepartment}
            onChange={(e) => setLocalDepartment(e.target.value)}
          >
            <option value="">Tots</option>
            {deptOptions.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
      )}

      {/* WORKER */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Treballador</label>
        <select
          className="border rounded-lg p-2"
          value={localWorker}
          onChange={(e) => setLocalWorker(e.target.value)}
        >
          <option value="">Tots</option>

          {workerOptions.map((w) => (
            <option
              key={w.id || w.name}     // sempre consistent
              value={w.name}           // 🔥 FILTREM PER NOM REAL
            >
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* BOTONS */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={applyFilters}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Aplicar filtres
        </button>

        <button
          onClick={resetFilters}

          className="p-2 h-10 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

    </div>
  )
}
