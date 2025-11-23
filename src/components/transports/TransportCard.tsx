// file: src/components/transports/TransportCard.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Edit2, Truck, FileText, AlertTriangle } from 'lucide-react'
import type { Transport } from '@/hooks/useTransports'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface Props {
  transport: Transport
  driverName?: string | null
  onEdit: () => void
  onDelete: () => void
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('ca-ES')
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

  // 🧠 Càlcul estat ITV i revisió
  const today = new Date()
  const itvInfo = useMemo(() => {
    if (!transport.itvExpiry) {
      return { label: 'Sense data ITV', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' }
    }

    const exp = new Date(transport.itvExpiry)
    if (Number.isNaN(exp.getTime())) {
      return { label: 'ITV invàlida', color: 'text-red-600', badge: 'bg-red-100 text-red-700' }
    }

    const diffMs = exp.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'ITV caducada', color: 'text-red-600', badge: 'bg-red-100 text-red-700' }
    }

    if (diffDays <= 30) {
      return { label: `ITV caduca en ${diffDays} dies`, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' }
    }

    return { label: `ITV vigent fins ${formatDate(transport.itvExpiry)}`, color: 'text-green-600', badge: 'bg-green-100 text-green-700' }
  }, [transport.itvExpiry, today])

  const serviceInfo = useMemo(() => {
    if (!transport.nextService) {
      return { label: 'Sense propera revisió', color: 'text-slate-500' }
    }
    const next = new Date(transport.nextService)
    if (Number.isNaN(next.getTime())) {
      return { label: 'Data revisió invàlida', color: 'text-red-600' }
    }

    const diffMs = next.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Revisió vençuda', color: 'text-red-600' }
    }
    if (diffDays <= 30) {
      return { label: `Revisió en ${diffDays} dies`, color: 'text-amber-600' }
    }
    return { label: `Properà revisió: ${formatDate(transport.nextService)}`, color: 'text-green-600' }
  }, [transport.nextService, today])

  const documentsCount = transport.documents?.length ?? 0

  return (
    <div className="p-4 rounded-2xl border border-gray-200 shadow-sm bg-white flex flex-col gap-3 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-base tracking-tight">
              {transport.plate}
            </h3>
            <span className="text-xs text-slate-500">
              {typeLabels[transport.type] || transport.type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
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

      {/* Badges conductor + estat ITV */}
      <div className="flex flex-wrap gap-2">
        {driverName ? (
          <Badge variant="outline" className="text-green-700 border-green-700">
            {driverName}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-400 border-gray-300">
            Sense conductor
          </Badge>
        )}

        <Badge className={itvInfo.badge}>
          <AlertTriangle className="h-3 w-3 mr-1" />
          {itvInfo.label}
        </Badge>
      </div>

      {/* Bloc ITV + Revisió */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            ITV
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-600">
              Data ITV: <span className="font-medium">{formatDate(transport.itvDate)}</span>
            </span>
            <span className={itvInfo.color}>
              Caducitat: <span className="font-medium">{formatDate(transport.itvExpiry)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            Revisió
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-600">
              Última: <span className="font-medium">{formatDate(transport.lastService)}</span>
            </span>
            <span className={serviceInfo.color}>
              {serviceInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Documents + Disponibilitat */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <FileText className="h-4 w-4 text-slate-500" />
          <span>
            {documentsCount === 0
              ? 'Sense documentació'
              : `${documentsCount} document${documentsCount > 1 ? 's' : ''} adjunt${documentsCount > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
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
    </div>
  )
}
