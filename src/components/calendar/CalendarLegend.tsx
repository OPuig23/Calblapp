// file: src/components/calendar/CalendarLegend.tsx
'use client'

import React from 'react'

export default function CalendarLegend() {
  const items = [
    { label: 'Empresa', color: 'bg-blue-100 border border-blue-300 text-blue-700' },
    { label: 'Casaments', color: 'bg-green-100 border border-green-300 text-green-700' },
    { label: 'Grups Restaurants', color: 'bg-yellow-100 border border-yellow-300 text-yellow-700' },
    { label: 'Foodlovers', color: 'bg-pink-100 border border-pink-300 text-pink-700' },
    { label: 'Agenda', color: 'bg-orange-100 border border-orange-300 text-orange-700' },
  ]

  const stages = [
    { label: 'Prereserva / Calentet', dot: 'bg-blue-400' },
    { label: 'Proposta / Pendent signar', dot: 'bg-orange-400' },
    { label: 'Confirmat / Cerrada ganada', dot: 'bg-green-500' },
  ]

  return (
    <div className="w-full border border-gray-200 rounded-lg bg-white/70 backdrop-blur-sm shadow-sm px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
      {/* Línies de negoci */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-gray-500">LN:</span>
        {items.map((it) => (
          <span
            key={it.label}
            className={`px-2 py-[1px] rounded-full border ${it.color} leading-tight`}
          >
            {it.label}
          </span>
        ))}
      </div>

      {/* Etapes */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-500">Etapes:</span>
        {stages.map((st) => (
          <div key={st.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
            <span>{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
