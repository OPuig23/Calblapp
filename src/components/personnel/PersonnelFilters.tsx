//file: src/components/personnel/PersonnelFilters.tsx
'use client'

import React, { useState, useEffect } from 'react'

export interface PersonnelFiltersValues {
  department?: string
  search?: string
  role?: 'SOLDAT' | 'RESPONSABLE' | 'TREBALLADOR'
  isDriver?: boolean
  driverType?: 'camioGran' | 'camioPetit' | 'all'
}

interface PersonnelFiltersProps {
  departments: string[]
  onFilter: (filters: PersonnelFiltersValues) => void
}

export function PersonnelFilters({ departments, onFilter }: PersonnelFiltersProps) {
  const [dept, setDept] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'SOLDAT' | 'RESPONSABLE' | 'TREBALLADOR' | ''>('')
  const [isDriver, setIsDriver] = useState<'all' | 'yes' | 'no'>('all')
  const [driverType, setDriverType] = useState<'camioGran' | 'camioPetit' | 'all'>('all')

  // 🔄 Cada canvi notifica tots els valors junts
  useEffect(() => {
    onFilter({
      department: dept || undefined,
      search: search || undefined,
      role: role || undefined,
      isDriver: isDriver === 'yes' ? true : isDriver === 'no' ? false : undefined,
      driverType: isDriver === 'yes' ? driverType : undefined,
    })
  }, [dept, search, role, isDriver, driverType, onFilter])

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-2xl shadow-sm">
      {/* Departament */}
      <select
        className="border rounded px-2 py-1"
        value={dept}
        onChange={(e) => setDept(e.target.value)}
      >
        <option value="">🌐 Tots departaments</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d[0].toUpperCase() + d.slice(1)}
          </option>
        ))}
      </select>

      {/* Rol */}
      <select
        className="border rounded px-2 py-1"
        value={role}
        onChange={(e) => setRole(e.target.value as any)}
      >
        <option value="">🌐 Tots rols</option>
        <option value="SOLDAT">SOLDAT</option>
        <option value="RESPONSABLE">RESPONSABLE</option>
        <option value="TREBALLADOR">TREBALLADOR</option>
      </select>

      {/* Conductor sí/no */}
      <select
        className="border rounded px-2 py-1"
        value={isDriver}
        onChange={(e) => setIsDriver(e.target.value as any)}
      >
        <option value="all">🌐 Tots</option>
        <option value="yes">✅ Conductor</option>
        <option value="no">❌ No conductor</option>
      </select>

      {/* Tipus de camió (només si és conductor) */}
      {isDriver === 'yes' && (
        <select
          className="border rounded px-2 py-1"
          value={driverType}
          onChange={(e) => setDriverType(e.target.value as any)}
        >
          <option value="all">🌐 Tots</option>
          <option value="camioGran">🚛 Camió gran</option>
          <option value="camioPetit">🚚 Camió petit</option>
        </select>
      )}

      {/* Cerca per nom */}
      <input
        type="text"
        className="border rounded px-2 py-1 flex-1"
        placeholder="Cerca per nom..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}
