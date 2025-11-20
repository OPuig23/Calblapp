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

function VehicleIcon({ type }: { type?: string }) {
  if (!type) return null
  switch (type.toLowerCase()) {
    case 'camiogran':
      return <Truck className="w-5 h-5 text-blue-800" />
    case 'camiopetit':
      return <Truck className="w-4 h-4 text-green-700" />
    case 'furgoneta':
      return <Car className="w-5 h-5 text-orange-600" />
    default:
      return <Truck className="w-5 h-5 text-gray-500" />
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
  const formatDate = (d: string) =>
    d ? d.split('-').slice(1).reverse().join('/') : '--/--'

  const formatTime = (t?: string) =>
    t ? t.substring(0, 5) : '--:--'

  return (
    <div className="
      border-b px-2 py-3 hover:bg-gray-50
      grid gap-2
      grid-cols-1
      sm:grid-cols-[32px_1fr_5.5rem_5.5rem_minmax(10rem,1fr)_minmax(10rem,1fr)_3.5rem]
      items-center
    ">
      
      {/* MOBILE LAYOUT */}
      <div className="flex items-start gap-2 sm:hidden">
        <div>{roleIcon[row.role]}</div>
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{row.name}</div>

          <div className="text-xs text-gray-600 mt-0.5">
            {formatDate(row.startDate)} · {formatTime(row.startTime)}
          </div>

          {row.meetingPoint && (
            <div className="text-xs text-gray-700 truncate">
              📍 {row.meetingPoint}
            </div>
          )}

          {row.role === 'conductor' && (
            <div className="text-xs flex items-center gap-1 text-gray-700">
              {row.plate || '—'} <VehicleIcon type={row.vehicleType} />
            </div>
          )}

          {row.role === 'brigada' && (
            <div className="text-xs text-purple-700">
              {row.workers || 0} persones
            </div>
          )}
        </div>

        {/* Accions mòbil */}
        <RowActions onEdit={onEdit} onDelete={onDelete} disabled={isLocked} />
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden sm:flex items-center justify-center">
        {roleIcon[row.role]}
      </div>

      <div className="hidden sm:block truncate font-medium">
        {row.role === 'brigada' ? (
          <span className="text-purple-700 font-semibold">
            {row.name} {row.workers ? `(+${row.workers})` : ''}
          </span>
        ) : (
          row.name || <span className="italic text-gray-400">Sense nom</span>
        )}
      </div>

      <div className="hidden sm:block w-[5.5rem] tabular-nums">
        {formatDate(row.startDate)}
      </div>

      <div className="hidden sm:block w-[5.5rem] tabular-nums">
        {formatTime(row.startTime)}
      </div>

      <div className="hidden sm:block truncate text-xs text-gray-700">
        {row.meetingPoint || <span className="text-gray-400">—</span>}
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-800">
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

      <div className="hidden sm:block">
        <RowActions onEdit={onEdit} onDelete={onDelete} disabled={isLocked} />
      </div>
    </div>
  )
}
