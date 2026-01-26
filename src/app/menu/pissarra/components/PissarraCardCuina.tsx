// filename: src/app/menu/pissarra/components/PissarraCardCuina.tsx
'use client'

import type { PissarraItem } from '@/hooks/usePissarra'
import {
  MapPin,
  Clock,
  Users,
  Coffee,
  Truck,
  UtensilsCrossed,
  ChefHat,
} from 'lucide-react'

type Props = {
  item: PissarraItem
}

export default function PissarraCardCuina({ item }: Props) {
  const group1Drivers = Array.isArray(item.group1Drivers) ? item.group1Drivers : []
  const group1Workers = Array.isArray(item.group1Workers) ? item.group1Workers : []
  const group2Drivers = Array.isArray(item.group2Drivers) ? item.group2Drivers : []
  const group2Workers = Array.isArray(item.group2Workers) ? item.group2Workers : []

  const renderGroup = (
    label: string,
    startTime?: string,
    meetingPoint?: string,
    responsible?: string | null,
    drivers?: string[],
    workers?: string[]
  ) => (
    <div className="border-t pt-2 mt-2">
      <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-1">
        <Coffee className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold">{label}</span>
        <span className="text-gray-500">Hora inici:</span>
        <span>{startTime || '-'}</span>
      </div>

      <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-1">
        <MapPin className="w-3.5 h-3.5 text-gray-400" />
        <span className="truncate">{meetingPoint || '-'}</span>
      </div>

      <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-1">
        <ChefHat className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium truncate">{responsible || '-'}</span>
      </div>

      <div className="flex items-start gap-2 text-[12px] text-gray-700 mb-1">
        <Truck className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
        <div className="space-y-1 flex-1">
          {(!drivers || drivers.length === 0) && (
            <span className="text-gray-400">Sense conductors</span>
          )}
          {drivers?.map((d, idx) => (
            <span
              key={`${d || '-'}-${idx}`}
              className="inline-block bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 mr-1 mb-1"
            >
              {d || '-'}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 text-[12px] text-gray-700">
        <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
        <div className="space-y-1 flex-1">
          {(!workers || workers.length === 0) && (
            <span className="text-gray-400">Sense treballadors</span>
          )}
          {workers?.map((w, idx) => (
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

  return (
    <div className="rounded-xl border border-gray-300 bg-white shadow-sm p-3 sm:p-4 text-xs mb-3">
      {/* Event + hora inici event */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="font-semibold text-gray-800 text-[13px] truncate">
          {item.eventName || '-'}
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{item.startTime || '-'}</span>
        </div>
      </div>

      {/* Servei */}
      <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-1">
        <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400" />
        <span className="truncate">{item.servei || '-'}</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-2">
        <Users className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold">{item.pax ?? 0}</span>
      </div>

      {/* Ubicacio */}
      {item.location && (
        <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate">{item.location}</span>
        </div>
      )}

      {renderGroup(
        'G1',
        item.group1StartTime,
        item.group1MeetingPoint,
        item.group1Responsible || null,
        group1Drivers,
        group1Workers
      )}
      {item.group2StartTime ||
      item.group2MeetingPoint ||
      item.group2Responsible ||
      group2Drivers.length > 0 ||
      group2Workers.length > 0
        ? renderGroup(
            'G2',
            item.group2StartTime,
            item.group2MeetingPoint,
            item.group2Responsible || null,
            group2Drivers,
            group2Workers
          )
        : null}
    </div>
  )
}
