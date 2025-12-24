//file: src/app/menu/logistica/assignacions/components/TransportAssignmentCard.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Truck } from 'lucide-react'
import VehiclesTable from './VehiclesTable'

type VehicleRow = {
  id: string
  department?: string
  startDate?: string
  startTime?: string
  endTime?: string
  plate?: string
  vehicleType?: string
  name?: string
}

export default function TransportAssignmentCard({
  item,
  onChanged,
}: {
  item: {
    eventCode: string
    day: string
    eventStartTime: string
    eventName: string
    location: string
    service?: string
    pax: number
    status: 'draft' | 'confirmed'
    rows?: VehicleRow[]
  }
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)

  const rows = Array.isArray(item.rows) ? item.rows : []

  /* =========================
     VALIDACIÓ LÍNIA COMPLETA
  ========================= */
  const isRowComplete = (r: VehicleRow) =>
    Boolean(
      r.department &&
      r.startDate &&
      r.startTime &&
      r.endTime &&
      r.vehicleType &&
      r.plate &&
      r.name
    )

  /* =========================
     CÀLCULS
  ========================= */
  const totalVehicles = rows.length

  const completedVehicles = rows.filter(isRowComplete).length

  const statusColor = useMemo(() => {
    return item.status === 'confirmed'
      ? 'bg-green-500'
      : 'bg-blue-500'
  }, [item.status])

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {/* TARGETA COMPACTA */}
      <div
        className="grid grid-cols-[72px_1fr_120px_72px_1fr_96px_32px]
                   items-center gap-2 px-3 py-2 cursor-pointer hover:bg-emerald-50 transition"
        onClick={() => setOpen(v => !v)}
      >
        {/* Hora inici */}
        <div className="text-lg font-semibold text-gray-900 text-center">
          {item.eventStartTime || '--:--'}
        </div>

        {/* Esdeveniment */}
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {item.eventName}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {item.location} · <span className="font-mono">#{item.eventCode}</span>
          </div>
        </div>

        {/* Servei */}
        <div className="text-sm text-gray-800 truncate">
          {item.service || '—'}
        </div>

        {/* PAX */}
        <div className="text-center">
          <div className="font-semibold text-gray-900">{item.pax}</div>
          <div className="text-[11px] text-gray-500">pax</div>
        </div>

        {/* Vehicles resum */}
        <div className="flex flex-wrap gap-2">
          {rows.length > 0 ? (
            rows.map(v => (
              <span
                key={v.id}
                className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 border"
              >
                {v.plate || '—'} · {v.vehicleType || '—'}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">
              Sense vehicles
            </span>
          )}
        </div>

        {/* Estat + comptador */}
        <div className="flex items-center justify-center gap-2">
          <Truck size={16} />
          <span className="font-semibold text-sm">
            {completedVehicles}/{totalVehicles}
          </span>
          <span
            className={`inline-block w-3 h-3 rounded-full ${statusColor}`}
            title={
              item.status === 'confirmed'
                ? 'Quadrant confirmat'
                : 'Quadrant en esborrany'
            }
          />
        </div>

        {/* Expand */}
        <div className="flex justify-center">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* DETALL */}
      {open && (
        <div className="border-t bg-gray-50">
          <VehiclesTable item={item} onChanged={onChanged} />
        </div>
      )}
    </div>
  )
}
