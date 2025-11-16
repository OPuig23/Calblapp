// file: src/components/calendar/CalendarFilters.tsx
'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export type Mode = 'month' | 'week' | 'list'

export type CalendarFilterChange = {
  mode: Mode
  start?: string
  end?: string
  ln?: string
  stage?: string
}

export interface CalendarFiltersProps {
  defaultMode?: Mode
  onChange: (f: CalendarFilterChange) => void
  onReset?: () => void
}

const toIso = (d: Date) => format(d, 'yyyy-MM-dd')

export default function CalendarFilters({
  defaultMode = 'month',
  onChange,
  onReset,
}: CalendarFiltersProps) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [ln, setLn] = useState<string>('Tots')
  const [stage, setStage] = useState<string>('Tots')

  /* ────────────────────────────────────────────────
     OPCIONS
  ───────────────────────────────────────────────── */
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

  /* ────────────────────────────────────────────────
     ADAPTACIÓ ENTRE LN i Etapa
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (ln !== 'Tots' && !stagesByLN[ln].includes(stage)) {
      setStage('Tots')
    }
  }, [ln])

  /* ────────────────────────────────────────────────
     RANGE DE DATES DINÀMIC (Setmana o Mes)
  ───────────────────────────────────────────────── */
  const range = useMemo(() => {
    if (mode === 'week') {
      const from = startOfWeek(anchor, { weekStartsOn: 1 })
      const to = endOfWeek(anchor, { weekStartsOn: 1 })
      return { start: toIso(from), end: toIso(to) }
    }

    if (mode === 'list') {
      const from = startOfWeek(anchor, { weekStartsOn: 1 })
      const to = addWeeks(from, 1)
      return { start: toIso(from), end: toIso(to) }
    }

    const current = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    return {
      start: toIso(startOfMonth(current)),
      end: toIso(endOfMonth(current)),
    }
  }, [mode, anchor])

  /* ────────────────────────────────────────────────
     NOTIFICAR CANVIS A PAGE.TSX
  ───────────────────────────────────────────────── */
  const lastPayload = useRef<string>('')

  useEffect(() => {
    const payload = JSON.stringify({
      mode,
      start: range.start,
      end: range.end,
      ln,
      stage,
    })

    if (payload !== lastPayload.current) {
      lastPayload.current = payload
      onChange({
        mode,
        start: range.start,
        end: range.end,
        ln,
        stage,
      })
    }
  }, [mode, range.start, range.end, ln, stage])

  /* ────────────────────────────────────────────────
     NAVEGACIÓ TEMPORAL
  ───────────────────────────────────────────────── */
  const prev = () =>
    setAnchor((a) => (mode === 'week' || mode === 'list' ? addWeeks(a, -1) : addMonths(a, -1)))

  const next = () =>
    setAnchor((a) => (mode === 'week' || mode === 'list' ? addWeeks(a, 1) : addMonths(a, 1)))

  /* ────────────────────────────────────────────────
     RENDER — DUAL: DESKTOP + MOBILE
  ───────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* ╔════════════════════════════════╗ */}
      {/*     NAV TEMPORAL + MES / ANY      */}
      {/* ╚════════════════════════════════╝ */}
      <div className="flex items-center justify-between gap-3 py-1">
        <Button size="icon" variant="ghost" onClick={prev} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* MES / ANY */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize">
            {anchor.toLocaleDateString('ca-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <Button size="icon" variant="ghost" onClick={next} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ╔════════════════════════════════╗ */}
      {/*           FILTRES LN i Etapes     */}
      {/* ╚════════════════════════════════╝ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* LN */}
        <div>
          <label className="text-[11px] text-gray-500">Línia de negoci</label>
          <Select value={ln} onValueChange={(v) => setLn(v)}>
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

        {/* Etapes */}
        <div>
          <label className="text-[11px] text-gray-500">Estat</label>
          <Select value={stage} onValueChange={(v) => setStage(v)}>
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
      </div>

      {/* ╔════════════════════════════════╗ */}
      {/*             MODE DE VISTA         */}
      {/* ╚════════════════════════════════╝ */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={mode === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('month')}
        >
          Mes
        </Button>
        <Button
          variant={mode === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('week')}
        >
          Setmana
        </Button>
        <Button
          variant={mode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('list')}
        >
          Llista
        </Button>
      </div>

      {/* ╔════════════════════════════════╗ */}
      {/*                RESET              */}
      {/* ╚════════════════════════════════╝ */}
      {onReset && (
        <Button
          onClick={() => {
            setAnchor(new Date())
            setLn('Tots')
            setStage('Tots')
            setMode('month')
            onReset()
          }}
          variant="ghost"
          className="text-gray-600 justify-center mt-1"
        >
          Reiniciar filtres
        </Button>
      )}
    </div>
  )
}
