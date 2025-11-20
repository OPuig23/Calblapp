// file: src/app/menu/quadrants/drafts/components/DraftHeader.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Truck, User, CheckCircle, LucideIcon } from 'lucide-react'

type Draft = {
  code?: string
  eventName?: string
  location?: string
}

type DraftHeaderProps = {
  draft: Draft
  department: string
  assigned: { responsables: number; conductors: number; treballadors: number }
  requested: { responsables: number; conductors: number; treballadors: number }
  confirmed: boolean
}

const deptStyles: Record<
  string,
  { label: string; className: string; Icon: LucideIcon }
> = {
  logistica: {
    label: 'Logística',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: Truck,
  },
  serveis: {
    label: 'Serveis',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    Icon: User,
  },
  cuina: {
    label: 'Cuina',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    Icon: User,
  },
  default: {
    label: '—',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    Icon: User,
  },
}

export default function DraftHeader({
  draft,
  department,
  assigned,
  requested,
  confirmed,
}: DraftHeaderProps) {
  const deptConf = deptStyles[department] || deptStyles.default
  const tone = (a: number, r: number) =>
    a >= r
      ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
      : 'border-amber-200 text-amber-700 bg-amber-50'

  return (
    <div className="mb-4 w-full space-y-2 rounded-xl bg-white p-3 shadow-sm md:p-4">
      
      {/* CODE + EVENT NAME */}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-700">
          {draft.code}
        </span>
        <span className="text-base font-bold text-gray-900 leading-tight">
          {draft.eventName}
        </span>
        {draft.location && (
          <span className="text-xs text-blue-700">{draft.location}</span>
        )}
      </div>

      {/* BADGES */}
      <div className="flex flex-wrap gap-2 pt-2">
        {/* Departament */}
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-1 border ${deptConf.className}`}
        >
          <deptConf.Icon size={16} /> {deptConf.label}
        </Badge>

        {/* Confirmat */}
        {confirmed && (
          <Badge
            variant="outline"
            className="inline-flex items-center gap-1 border bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle size={16} /> Confirmat
          </Badge>
        )}

        {/* Comptadors */}
        <Badge
          className={`flex items-center gap-1 rounded-lg ${tone(
            assigned.responsables,
            requested.responsables
          )}`}
        >
          <GraduationCap size={16} /> {assigned.responsables}/
          {requested.responsables}
        </Badge>

        <Badge
          className={`flex items-center gap-1 rounded-lg ${tone(
            assigned.conductors,
            requested.conductors
          )}`}
        >
          <Truck size={16} /> {assigned.conductors}/{requested.conductors}
        </Badge>

        <Badge
          className={`flex items-center gap-1 rounded-lg ${tone(
            assigned.treballadors,
            requested.treballadors
          )}`}
        >
          <User size={16} /> {assigned.treballadors}/{requested.treballadors}
        </Badge>
      </div>
    </div>
  )
}
