// file: src/app/menu/incidents/components/IncidentsEventHeader.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { colorByLN } from '@/lib/colors'

interface Props {
  title: string
  code: string
  ln: string
  location: string
  service: string
  pax: number
  count: number
  commercial?: string
  onLocationClick?: () => void
}

const formatEventTitle = (title?: string) => {
  if (!title) return '(Sense títol)'
  const [firstPart] = title.split('/')
  const trimmed = firstPart.trim()
  return trimmed || '(Sense títol)'
}

export default function IncidentsEventHeader({
  title,
  code,
  ln,
  location,
  service,
  pax,
  count,
  commercial,
  onLocationClick
}: Props) {

  return (
    <div className="bg-slate-100 rounded-lg px-3 py-2 mb-2 border flex justify-between items-start">
      
      <div className="flex flex-col gap-1">
        
        {/* TITLES */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-sm text-slate-900">
            {formatEventTitle(title)}
          </span>

          <span className="text-xs text-slate-600">
            Codi: {code || '-'}
          </span>

          <span
            className={cn(
              'text-xs px-2 py-[2px] rounded-md',
              colorByLN(ln)
            )}
          >
            {ln || '—'}
          </span>
        </div>

        {/* INFO */}
        <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
          <span
            className="underline cursor-pointer text-blue-600"
            onClick={onLocationClick}
          >
            Ubicació: {location || '-'}
          </span>

          <span>Comercial: {commercial || '-'}</span>
          <span>Servei: {service || '-'}</span>
          <span>Pax: {pax || '-'}</span>
        </div>

      </div>

      <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-1">
        {count} incidències
      </Badge>
    </div>
  )
}
