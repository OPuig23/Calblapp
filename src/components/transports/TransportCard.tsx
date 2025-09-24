'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2, Truck } from 'lucide-react'
import type { Transport } from '@/hooks/useTransports'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface Props {
  transport: Transport
  driverName?: string | null
  onEdit: () => void
  onDelete: () => void
}

export function TransportCard({ transport, driverName, onEdit, onDelete }: Props) {
  const [available, setAvailable] = useState(transport.available)

  const handleToggle = async (newStatus: boolean) => {
    setAvailable(newStatus)

    try {
      await fetch(`/api/transports/${transport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newStatus }),
      })
    } catch (err) {
      console.error('Error actualitzant disponibilitat:', err)
    }
  }

  const typeLabels: Record<string, string> = {
    camioPetit: 'Camió petit',
    camioGran: 'Camió gran',
    furgoneta: 'Furgoneta',
  }

  return (
    <div className="p-4 rounded-2xl border border-gray-200 shadow-sm bg-white flex flex-col gap-3 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-base">{transport.plate}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-orange-100"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4 text-orange-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-red-100"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {typeLabels[transport.type] || transport.type}
        </Badge>
        {driverName ? (
          <Badge variant="outline" className="text-green-700 border-green-700">
            {driverName}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-400 border-gray-300">
            Sense conductor
          </Badge>
        )}
      </div>

      {/* Toggle de disponibilitat */}
      <div className="flex items-center justify-between pt-2">
        <span
          className={`text-sm font-medium ${
            available ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {available ? 'Disponible' : 'No disponible'}
        </span>
        <Switch
          checked={available}
          onCheckedChange={handleToggle}
          className={`${
            available
              ? 'data-[state=checked]:bg-green-500'
              : 'data-[state=unchecked]:bg-red-500'
          }`}
        />
      </div>
    </div>
  )
}
