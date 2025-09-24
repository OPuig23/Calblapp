// src/components/reports/FilterSidebar.tsx
'use client'

import React from 'react'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface ReportFilters {
  fromDate:    string
  toDate:      string
  eventName:   string
  department:  string
  workerName:  string
}

interface Props {
  filters:      ReportFilters
  departments:  string[]
  onChange:     (f: Partial<ReportFilters>) => void
  onApply:      () => void
  onReset:      () => void
  loading:      boolean
}

export default function FilterSidebar({
  filters,
  departments,
  onChange,
  onApply,
  onReset,
  loading
}: Props) {
  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      {/* Data Inici */}
      <div>
        <Label>Data Inici</Label>
        <Input
          type="date"
          value={filters.fromDate}
          onChange={e => onChange({ fromDate: e.target.value })}
        />
      </div>

      {/* Data Fi */}
      <div>
        <Label>Data Fi</Label>
        <Input
          type="date"
          value={filters.toDate}
          onChange={e => onChange({ toDate: e.target.value })}
        />
      </div>

      {/* Esdeveniment */}
      <div>
        <Label>Esdeveniment</Label>
        <Input
          placeholder="Codi o nom"
          value={filters.eventName}
          onChange={e => onChange({ eventName: e.target.value })}
        />
      </div>

      {/* Departament */}
      <div>
        <Label>Departament</Label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.department}
          onChange={e => onChange({ department: e.target.value })}
        >
          <option value="">Tots</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>

      {/* Nom Treballador */}
      <div>
        <Label>Nom Treballador</Label>
        <Input
          placeholder="Nom..."
          value={filters.workerName}
          onChange={e => onChange({ workerName: e.target.value })}
        />
      </div>

      {/* Botons */}
      <div className="flex space-x-2 pt-2">
        {/* Botó Aplica destacat */}
        <Button
          onClick={onApply}
          disabled={loading}
          className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          {loading ? 'Filtrant…' : 'Aplica'}
        </Button>

        {/* Botó Neteja */}
        <Button
          variant="outline"
          onClick={onReset}
          className="border-gray-400 text-gray-700 hover:bg-gray-100"
        >
          Neteja
        </Button>
      </div>
    </div>
  )
}
