// file: src/app/menu/quadrants/drafts/components/DraftRow.tsx
'use client'

import React from 'react'
import RowActions from './RowActions'
import { GraduationCap, Truck, User, Car, Users } from 'lucide-react'
import type { Row } from './types'

const roleIcon: Record<'responsable'|'conductor'|'treballador'|'brigada', React.ReactNode> = {
  responsable: <GraduationCap className="text-blue-700" size={20} />,
  conductor:   <Truck className="text-orange-500" size={18} />,
  treballador: <User className="text-green-600" size={18} />,
  brigada:     <Users className="text-purple-600" size={18} />,
}

// Helper: icona per tipus de vehicle
function VehicleIcon({ type }: { type?: string }) {
  if (!type) return null
  switch (type.toLowerCase()) {
    case 'camiogran':
      return <Truck className="w-5 h-5 text-blue-800" title="Camió gran" />
    case 'camiopetit':
      return <Truck className="w-4 h-4 text-green-700" title="Camió petit" />
    case 'furgoneta':
      return <Car className="w-5 h-5 text-orange-600" title="Furgoneta" />
    default:
      return <Truck className="w-5 h-5 text-gray-500" title={type} />
  }
}

export default function DraftRow({
  row,
  isLocked,
  onEdit,
  onDelete
}: {
  row: Row
  isLocked: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const formatDate = (d: string) => d ? d.split('-').slice(1).reverse().join('/') : '--/--'
  const formatTime = (t?: string) => t ? t.substring(0, 5) : '--:--'

  return (
    <div
      className="relative grid items-center border-b px-1 py-2 hover:bg-gray-50 sm:px-2"
      style={{
        gridTemplateColumns:
          '32px 1fr 5.5rem 5.5rem minmax(10rem,1fr) minmax(10rem,1fr) 3.5rem'
      }}
    >
      {/* Icona rol */}
      <div className="flex items-center justify-center">{roleIcon[row.role]}</div>

      {/* Nom */}
      <div className="min-w-0 truncate font-medium">
        {row.role === 'brigada' ? (
          <span className="text-purple-700 font-semibold">
            {row.name || 'Brigada sense nom'}{' '}
            {row.workers ? <span className="ml-1 text-xs text-gray-500">(+{row.workers})</span> : null}
          </span>
        ) : (
          row.name || <span className="italic text-gray-400">Sense nom</span>
        )}
      </div>

      {/* Data i hora */}
      <div className="w-[5.5rem] tabular-nums text-left font-mono text-sm">
        {formatDate(row.startDate)}
      </div>
      <div className="w-[5.5rem] tabular-nums text-left font-mono text-sm">
        {formatTime(row.startTime)}
      </div>

      {/* Meeting point */}
      <div className="min-w-0 truncate text-xs text-gray-700">
        {row.meetingPoint || <span className="text-gray-400">—</span>}
      </div>

      {/* Vehicle o nº persones de brigada */}
      <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
        {row.role === 'conductor' ? (
          <>
            <span>{row.plate || '—'}</span>
            <VehicleIcon type={row.vehicleType} />
          </>
        ) : row.role === 'brigada' ? (
          <span className="text-purple-700">{row.workers || 0} persones</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>

      {/* Accions */}
      <RowActions onEdit={onEdit} onDelete={onDelete} disabled={isLocked} />
    </div>
  )
}
