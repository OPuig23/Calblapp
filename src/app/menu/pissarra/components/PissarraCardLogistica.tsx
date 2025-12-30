// filename: src/app/menu/pissarra/components/PissarraCardLogistica.tsx
'use client'

import type { PissarraItem } from '@/hooks/usePissarra'
import { MapPin, Clock, Users, User, Truck, UtensilsCrossed, ChefHat } from 'lucide-react'

type Props = {
  item: PissarraItem
}

export default function PissarraCardLogistica({ item }: Props) {
  const vehicles = Array.isArray(item.vehicles) ? item.vehicles : []
  const workers = Array.isArray(item.workers) ? item.workers : []

  return (
    <div className="rounded-xl border border-gray-300 bg-white shadow-sm p-3 sm:p-4 text-xs mb-3">

      {/* Event + hores */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="font-semibold text-gray-800 text-[13px] truncate">
          {item.eventName || '-'}
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{item.startTime || '-'}</span>
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{item.arrivalTime || '-'}</span>
        </div>
      </div>

      {/* Ubicacio */}
      {item.location && (
        <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate">{item.location}</span>
        </div>
      )}

      {/* Vehicles */}
      <div className="flex items-start gap-2 text-[12px] text-gray-700 mb-2">
        <div className="space-y-1 flex-1">
          {vehicles.length === 0 && <span className="text-gray-400">Sense vehicles</span>}
          {vehicles.map((v, idx) => {
            const isCuina = v?.source?.toLowerCase().includes('cuina')
            const Icon = Truck
            const iconColor = 'text-gray-500'
            const ConductorIcon = isCuina ? ChefHat : User
            const conductorColor = isCuina ? 'text-orange-500' : 'text-gray-600'

            return (
              <div
                key={v?.plate ? `plate-${v.source || 'src'}-${v.plate}` : `vehicle-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
              >
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                <span className="font-semibold">{v.plate || '-'}</span>
                <span className="text-gray-600 flex items-center gap-1 text-[11px]">
                  <ConductorIcon className={`w-3 h-3 ${conductorColor}`} />
                  {v.conductor || '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Treballadors */}
      <div className="flex items-start gap-2 text-[12px] text-gray-700">
        <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
        <div className="space-y-1 flex-1">
          {workers.length === 0 && <span className="text-gray-400">Sense treballadors</span>}
          {workers.map((w, idx) => (
            <span
              key={`${w || '-'}-${idx}`}
              className="inline-block bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 mr-1 mb-1"
            >
              {w || '-'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}


