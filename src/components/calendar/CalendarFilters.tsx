// file: src/components/calendar/CalendarFilters.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import ResetFilterButton from '@/components/ui/ResetFilterButton'

export type CalendarStage = 'all' | 'confirmat' | 'pressupost' | 'calentet'

export type CalendarLN =
  | 'all'
  | 'empresa'
  | 'casaments'
  | 'grups restaurants'
  | 'foodlovers'
  | 'agenda'
  | 'altres'

export interface CalendarFilterChange {
  ln?: CalendarLN
  stage?: CalendarStage
  commercial?: string
}

export interface CalendarFiltersProps {
  ln?: CalendarLN | string
  stage?: CalendarStage | string
  commercial?: string
  comercialOptions?: string[]
  onChange: (f: CalendarFilterChange) => void
  onReset?: () => void
}

const LN_OPTIONS: { label: string; value: CalendarLN }[] = [
  { label: 'Totes', value: 'all' },
  { label: 'Empresa', value: 'empresa' },
  { label: 'Casaments', value: 'casaments' },
  { label: 'Grups Restaurants', value: 'grups restaurants' },
  { label: 'Foodlovers', value: 'foodlovers' },
  { label: 'Agenda', value: 'agenda' },
  { label: 'Altres', value: 'altres' },
]

const STAGE_OPTIONS: { label: string; value: CalendarStage }[] = [
  { label: 'Tots', value: 'all' },
  { label: 'Confirmats', value: 'confirmat' },
  { label: 'Pressupost enviat', value: 'pressupost' },
  { label: 'Prereserva / Calentet', value: 'calentet' },
]

const normalize = (v = '') =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function coerceAll(v?: string) {
  const n = normalize(v || '')
  if (!n) return 'all'
  if (n === 'all') return 'all'
  if (n.startsWith('tots') || n.startsWith('totes')) return 'all'
  return v || 'all'
}

export default function CalendarFilters({
  ln: lnProp,
  stage: stageProp,
  commercial: commercialProp,
  comercialOptions,
  onChange,
  onReset,
}: CalendarFiltersProps) {
  const [ln, setLn] = useState<CalendarLN>(() => coerceAll(String(lnProp || 'all')) as CalendarLN)
  const [stage, setStage] = useState<CalendarStage>(() => coerceAll(String(stageProp || 'all')) as CalendarStage)
  const [commercial, setCommercial] = useState<string>(() => commercialProp || 'all')

  const showCommercial = useMemo(
    () => Array.isArray(comercialOptions) && comercialOptions.length > 0,
    [comercialOptions]
  )

  const [initialized, setInitialized] = useState(false)

  // Si la pàgina canvia valors (ex: reset), sincronitza aquí
  useEffect(() => setLn(coerceAll(String(lnProp || 'all')) as CalendarLN), [lnProp])
  useEffect(() => setStage(coerceAll(String(stageProp || 'all')) as CalendarStage), [stageProp])
  useEffect(() => setCommercial(commercialProp || 'all'), [commercialProp])
  

  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      return
    }
    onChange({ ln, stage, commercial })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ln, stage, commercial])

  const resetAll = () => {
    setLn('all')
    setStage('all')
    setCommercial('all')
    onReset?.()
  }

  return (
    <div className="flex flex-col gap-4 w-full p-3">
      {/* 🧩 LN */}
      <div>
        <label className="text-[11px] text-gray-500">Línia de negoci</label>
        <Select value={ln} onValueChange={(v) => setLn(v as CalendarLN)}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LN_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🎨 Stage */}
      <div>
        <label className="text-[11px] text-gray-500">Estat</label>
        <Select value={stage} onValueChange={(v) => setStage(v as CalendarStage)}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 👤 Comercial (opcional) */}
      {showCommercial && (
        <div>
          <label className="text-[11px] text-gray-500">Comercial</label>
         <Select
  key={`${ln}-${comercialOptions?.join('|')}`}
  value={commercial}
  onValueChange={(v) => setCommercial(v)}
>

            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots</SelectItem>
              {comercialOptions!.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onReset && <ResetFilterButton onClick={resetAll} />}
    </div>
  )
}
