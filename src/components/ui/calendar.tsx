'use client'

import React from 'react'

interface CalendarProps {
  mode?: 'single' | 'range'
  selected?: any
  onSelect?: (value: any) => void
}

export function Calendar({ mode = 'single', selected, onSelect }: CalendarProps) {
  if (mode === 'range') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
          value={selected?.from || ''}
          onChange={(e) =>
            onSelect?.({
              from: e.target.value,
              to: selected?.to || ''
            })
          }
        />
        <span className="text-gray-600">→</span>
        <input
          type="date"
          className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
          value={selected?.to || ''}
          onChange={(e) =>
            onSelect?.({
              from: selected?.from || '',
              to: e.target.value
            })
          }
        />
      </div>
    )
  }

  return (
    <input
      type="date"
      className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
      value={selected || ''}
      onChange={(e) => onSelect?.(e.target.value)}
    />
  )
}
