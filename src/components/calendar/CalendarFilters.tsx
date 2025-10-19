// ✅ file: src/components/calendar/CalendarFilters.tsx
'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
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
import { es } from 'date-fns/locale'

export type Mode = 'month' | 'week'

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

  /* ─── Mesos i anys ─── */
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => currentYear - 2 + i)
  }, [])

  const months = [
    'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
    'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
  ]

  /* ─── Opcions de filtres ─── */
  const lnOptions = ['Tots', 'Empresa', 'Casaments', 'Grups Restaurants', 'Foodlovers', 'Agenda', 'Altres']
  const stageOptions = ['Tots', 'Confirmat', 'Proposta / Pendent signar', 'Prereserva / Calentet']

  const stagesByLN: Record<string, string[]> = {
    Empresa: ['Confirmat', 'Proposta / Pendent signar'],
    Casaments: ['Confirmat', 'Prereserva / Calentet'],
    'Grups Restaurants': ['Confirmat'],
    Foodlovers: ['Confirmat'],
    Agenda: ['Confirmat'],
    Altres: ['Confirmat', 'Proposta / Pendent signar', 'Prereserva / Calentet'],
    Tots: stageOptions,
  }

  /* ─── Sincronització entre LN i Stage ─── */
  useEffect(() => {
    if (ln !== 'Tots' && !stagesByLN[ln]?.includes(stage)) {
      setStage('Tots')
    }
  }, [ln])

  /* ─── Rang de dates actual (mes o setmana) ─── */
  const range = useMemo(() => {
    if (mode === 'week') {
      const from = startOfWeek(anchor, { weekStartsOn: 1 })
      const to = endOfWeek(anchor, { weekStartsOn: 1 })
      return { start: toIso(from), end: toIso(to) }
    }
    const from = startOfMonth(anchor)
    const to = endOfMonth(anchor)
    return { start: toIso(from), end: toIso(to) }
  }, [mode, anchor])

  /* ─── Notifica canvis a CalendarPage ─── */
  const lastPayload = useRef<string>('')

  useEffect(() => {
    const payload = JSON.stringify({
      mode,
      start: range.start,
      end: range.end,
      ln,
      stage,
    })

    // Evita bucles infinits
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
  }, [mode, range.start, range.end, ln, stage, onChange])

  /* ─── Navegació temporal ─── */
  const prev = () => setAnchor(a => (mode === 'week' ? addWeeks(a, -1) : addMonths(a, -1)))
  const next = () => setAnchor(a => (mode === 'week' ? addWeeks(a, 1) : addMonths(a, 1)))

  const handleMonthChange = (mIndex: number) => {
    const newDate = new Date(anchor)
    newDate.setMonth(mIndex)
    setAnchor(newDate)
  }

  const handleYearChange = (y: number) => {
    const newDate = new Date(anchor)
    newDate.setFullYear(y)
    setAnchor(newDate)
  }

  /* ─── RENDER ─── */
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2 bg-white/70 p-3 rounded-2xl border border-gray-200 shadow-sm">
      {/* 🔹 Navegació temporal */}
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays className="text-blue-600" size={20} />
        <Button size="icon" variant="ghost" onClick={prev} className="h-8 w-8 text-gray-600">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select value={String(anchor.getMonth())} onValueChange={(v) => handleMonthChange(Number(v))}>
          <SelectTrigger className="w-[110px] text-xs sm:text-sm">
            <SelectValue>{months[anchor.getMonth()]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(anchor.getFullYear())} onValueChange={(v) => handleYearChange(Number(v))}>
          <SelectTrigger className="w-[90px] text-xs sm:text-sm">
            <SelectValue>{anchor.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="icon" variant="ghost" onClick={next} className="h-8 w-8 text-gray-600">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 🔹 Filtres LN i Stage */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Filter size={16} className="text-gray-500" />
        <Select value={ln} onValueChange={(v) => setLn(v)}>
          <SelectTrigger className="w-[130px] text-xs sm:text-sm">
            <SelectValue>{ln}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {lnOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stage} onValueChange={(v) => setStage(v)}>
          <SelectTrigger className="w-[150px] text-xs sm:text-sm">
            <SelectValue>{stage}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {stagesByLN[ln]?.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🔹 Mode i Reset */}
      <div className="flex items-center gap-2">
        <Select value={mode} onValueChange={(v: Mode) => setMode(v)}>
          <SelectTrigger className="w-[140px] text-xs sm:text-sm">
            <SelectValue placeholder="Vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Vista mensual</SelectItem>
            <SelectItem value="week">Vista setmanal</SelectItem>
          </SelectContent>
        </Select>

        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600"
            onClick={() => {
              setMode('month')
              setAnchor(new Date())
              setLn('Tots')
              setStage('Tots')
              onReset()
            }}
          >
            Reiniciar
          </Button>
        )}
      </div>
    </div>
  )
}
