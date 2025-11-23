// ✅ file: src/components/calendar/CalendarFilters.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import ResetFilterButton from '@/components/ui/ResetFilterButton'

export interface CalendarFilterChange {
  ln?: string
  stage?: string
  commercial?: string
}

export interface CalendarFiltersProps {
  ln: string
  stage: string
  commercial: string
  comercialOptions: string[]
  onChange: (f: CalendarFilterChange) => void
  onReset?: () => void
}


export default function CalendarFilters({
  onChange,
  onReset,
  comercialOptions = [],
}: CalendarFiltersProps) {
  const [ln, setLn] = useState('Tots')
  const [stage, setStage] = useState('Tots')
  const [commercial, setCommercial] = useState('Tots')

  const lnOptions = [
    'Tots',
    'Empresa',
    'Casaments',
    'Grups Restaurants',
    'Foodlovers',
    'Agenda',
    'Altres',
  ]

  const stageOptions = [
    'Tots',
    'Confirmat',
    'Proposta / Pendent signar',
    'Prereserva / Calentet',
  ]

  const stagesByLN: Record<string, string[]> = {
    Empresa: ['Confirmat', 'Proposta / Pendent signar'],
    Casaments: ['Confirmat', 'Prereserva / Calentet'],
    'Grups Restaurants': ['Confirmat'],
    Foodlovers: ['Confirmat'],
    Agenda: ['Confirmat'],
    Altres: stageOptions,
    Tots: stageOptions,
  }

  useEffect(() => {
    if (!stagesByLN[ln].includes(stage)) setStage('Tots')
  }, [ln])

  useEffect(() => {
    onChange({ ln, stage, commercial })
  }, [ln, stage, commercial])

  return (
    <div className="flex flex-col gap-4 w-full p-3">

      {/* LN */}
      <div>
        <label className="text-[11px] text-gray-500">Línia de negoci</label>
        <Select value={ln} onValueChange={setLn}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lnOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stage */}
      <div>
        <label className="text-[11px] text-gray-500">Etapa</label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stagesByLN[ln].map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comercial */}
      {comercialOptions.length > 0 && (
        <div>
          <label className="text-[11px] text-gray-500">Comercial</label>
          <Select value={commercial} onValueChange={setCommercial}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tots">Tots</SelectItem>
              {comercialOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onReset && (
        <ResetFilterButton
          onClick={() => {
            setLn('Tots')
            setStage('Tots')
            setCommercial('Tots')
            onReset()
          }}
        />
      )}
    </div>
  )
}
