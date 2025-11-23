//file: src/app/menu/quadrants/drafts/components/QuadrantCard.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Users, User, Truck, ChevronDown, ChevronUp, MapPin, Tag } from 'lucide-react'
import type { Draft } from '@/app/menu/quadrants/drafts/page'
import DraftsTable from './DraftsTable'

interface Props {
  quadrant: Draft
  autoExpand?: boolean       // ⭐ nova prop
}

export default function QuadrantCard({ quadrant, autoExpand = false }: Props) {
  const [expanded, setExpanded] = useState(autoExpand)   // ⭐ si autoExpand = true → s'obre directament
  React.useEffect(() => {
    if (autoExpand) setExpanded(true)
  }, [autoExpand])


  // Comptadors assignats
  const assigned = useMemo(() => ({
    responsables: quadrant.responsableName ? 1 : 0,
    conductors: quadrant.conductors?.length || 0,
    treballadors: quadrant.treballadors?.length || 0,
  }), [quadrant])

  // Comptadors requerits
  const requested = useMemo(() => ({
    responsables: quadrant.responsablesNeeded || 1,
    conductors: quadrant.numDrivers || 0,
    treballadors: quadrant.totalWorkers || 0,
  }), [quadrant])

  return (
    <div className="rounded-xl border bg-white shadow-sm hover:shadow-md transition">
      {/* Header resum */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Títol i estat */}
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-semibold text-gray-800">
            {quadrant.eventName || 'Sense nom'}
          </h3>

          <div className="flex gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                quadrant.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {quadrant.status === 'confirmed' ? 'Confirmat' : 'Esborrany'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
              {quadrant.department || '—'}
            </span>
          </div>
        </div>

        {/* Ubicació */}
        {quadrant.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quadrant.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            <MapPin className="w-3 h-3" />
            {quadrant.location}
          </a>
        )}

        {/* Codi + Resum personal */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-600">
          {/* Codi */}
          <span className="flex items-center gap-1 font-mono">
            <Tag size={14} className="text-gray-400" />
            {quadrant.code || '—'}
          </span>

          {/* Comptadors */}
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-blue-700">
              <User size={14}/> {assigned.responsables}/{requested.responsables}
            </span>
            <span className="flex items-center gap-1 text-orange-600">
              <Truck size={14}/> {assigned.conductors}/{requested.conductors}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <Users size={14}/> {assigned.treballadors}/{requested.treballadors}
            </span>
          </div>
        </div>

        {/* Icona expand/reduce */}
        <div className="flex justify-end mt-2 text-gray-400">
          {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </div>
      </div>

      {/* Contingut expandit */}
      {expanded && (
        <div className="border-t p-4">
          <DraftsTable draft={quadrant} />
        </div>
      )}
    </div>
  )
}
