// file: src/app/menu/incidents/components/IncidentsFilters.tsx
'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  from: string
  to: string
  importance?: string
  setFrom: (v: string) => void
  setTo: (v: string) => void
  setImportance: (v: string | undefined) => void
  onApply: () => void
}

export default function IncidentsFilters({
  from,
  to,
  importance,
  setFrom,
  setTo,
  setImportance,
  onApply,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 p-2 items-end">
      {/* 🔹 Dates */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Des de</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Fins a</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9"
        />
      </div>

      {/* 🔹 Filtre importància */}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Importància</label>
        <Select
          value={importance || 'all'}
          onValueChange={(val) => setImportance(val === 'all' ? undefined : val)}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Totes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Totes</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onApply} className="h-9">
        Aplica
      </Button>
    </div>
  )
}
