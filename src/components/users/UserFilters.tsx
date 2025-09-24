// File: src/components/users/UserFilters.tsx
'use client'

import React, { useMemo } from 'react'
import { UserFiltersState } from '@/app/menu/users/page'

type Props = {
  filters: UserFiltersState
  setFilters: (f: Partial<UserFiltersState>) => void
  departmentOptions: string[]
  roleOptions: string[]
  users: { department?: string; role?: string }[]
}

export default function UserFilters({
  filters,
  setFilters,
  departmentOptions,
  roleOptions,
  users,
}: Props) {
  const safeUsers = users || []

  // 🔽 Rols dinàmics
  const dynamicRoles = useMemo(() => {
    let base = safeUsers
    if (filters.department && filters.department !== '__all__') {
      base = base.filter((u) => u.department === filters.department)
    }
    const roles = base.map((u) => u.role).filter(Boolean) as string[]
    return Array.from(new Set(roles))
  }, [filters.department, safeUsers])

  // 🔽 Departaments dinàmics
  const dynamicDepartments = useMemo(() => {
    let base = safeUsers
    if (filters.role && filters.role !== '__all__') {
      base = base.filter((u) => u.role === filters.role)
    }
    const depts = base.map((u) => u.department).filter(Boolean) as string[]
    return Array.from(new Set(depts))
  }, [filters.role, safeUsers])

  // 🔽 Handler neteja
  const clearFilters = () => {
    setFilters({ department: '__all__', role: '__all__' })
  }

  return (
    <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      {/* Departament */}
      <select
        value={filters.department || '__all__'}
        onChange={(e) => setFilters({ department: e.target.value })}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        <option value="__all__">🌐 Tots els departaments</option>
        {dynamicDepartments.map((dep) => (
          <option key={dep} value={dep}>
            {dep}
          </option>
        ))}
      </select>

      {/* Rol */}
      <select
        value={filters.role || '__all__'}
        onChange={(e) => setFilters({ role: e.target.value })}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        <option value="__all__">👥 Tots els rols</option>
        {dynamicRoles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      {/* Botó Neteja */}
      <button
        onClick={clearFilters}
        className="ml-auto px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        Neteja
      </button>
    </div>
  )
}
