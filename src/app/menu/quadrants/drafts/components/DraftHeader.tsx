//file:src\app\menu\quadrants\drafts\components\DraftHeader.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Truck, User, CheckCircle } from 'lucide-react'

type DraftHeaderProps = {
  draft: any
  department: string
  assigned: { responsables: number; conductors: number; treballadors: number }
  requested: { responsables: number; conductors: number; treballadors: number }
  confirmed: boolean
}

const deptStyles: Record<string, { label: string; className: string; Icon: any }> = {
  logistica: { label: 'Logística', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Truck },
  serveis:   { label: 'Serveis',   className: 'bg-sky-50 text-sky-700 border-sky-200', Icon: User },
  cuina:     { label: 'Cuina',     className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: User },
  default:   { label: '—',         className: 'bg-slate-100 text-slate-700 border-slate-200', Icon: User },
}

export default function DraftHeader({ draft, department, assigned, requested, confirmed }: DraftHeaderProps) {
  const deptConf = deptStyles[department] || deptStyles.default
  const tone = (a: number, r: number) => (a >= r ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700')

  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold">{draft.code} – {draft.eventName}</h2>
        {draft.location && (
          <p className="truncate text-xs text-blue-700">{draft.location}</p>
        )}

        {/* Departament + Comptadors + Estat */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`inline-flex items-center gap-1 border ${deptConf.className}`}>
            <deptConf.Icon size={14} /> {deptConf.label}
          </Badge>

          {confirmed && (
            <Badge variant="outline" className="inline-flex items-center gap-1 border bg-green-50 text-green-700 border-green-200">
              <CheckCircle size={14} /> Confirmat
            </Badge>
          )}

          <Badge variant="outline" className={`flex items-center gap-1 rounded-lg ${tone(assigned.responsables, requested.responsables)}`}>
            <GraduationCap size={14} /> {assigned.responsables}/{requested.responsables}
          </Badge>
          <Badge variant="outline" className={`flex items-center gap-1 rounded-lg ${tone(assigned.conductors, requested.conductors)}`}>
            <Truck size={14} /> {assigned.conductors}/{requested.conductors}
          </Badge>
          <Badge variant="outline" className={`flex items-center gap-1 rounded-lg ${tone(assigned.treballadors, requested.treballadors)}`}>
            <User size={14} /> {assigned.treballadors}/{requested.treballadors}
          </Badge>
        </div>
      </div>
    </div>
  )
}
