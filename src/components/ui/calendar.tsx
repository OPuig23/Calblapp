// file: src/components/ui/calendar.tsx
'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarProps {
  mode?: 'single' | 'range'
  selected?: any
  onSelect?: (value: any) => void
}

export function Calendar({ mode = 'single', selected, onSelect }: CalendarProps) {
  return (
    <div className="p-2 bg-white rounded-xl shadow-md">
      <DayPicker
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        locale={es}
        showOutsideDays
        numberOfMonths={1}
        defaultMonth={selected?.from || new Date()}
        weekStartsOn={1}
        styles={{
          caption: { textTransform: 'capitalize' },
          head_cell: { textTransform: 'capitalize', color: '#666' },
        }}
        modifiersClassNames={{
          selected: 'bg-blue-600 text-white rounded-full',
          range_start: 'bg-blue-500 text-white rounded-full',
          range_end: 'bg-blue-500 text-white rounded-full',
          range_middle: 'bg-blue-100 text-blue-700',
        }}
      />
    </div>
  )
}
