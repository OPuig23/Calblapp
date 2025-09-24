//file: src/app/menu/quadrants/[id]/components/QuadrantFilters.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

export interface FiltersProps {
  onChange: (filters: {
    start?: string
    end?: string
    status?: 'all' | 'confirmed' | 'draft'
  }) => void
}

export default function QuadrantFilters({ onChange }: FiltersProps) {
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const [status, setStatus] = useState<'all' | 'confirmed' | 'draft'>('all')

  function handleApply() {
    onChange({ start: range.start, end: range.end, status })
  }

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {/* 🔽 Filtre per estat */}
      <Select
  value={status}
  onValueChange={(v) => {
    setStatus(v as any)
    onChange({ start: range.start, end: range.end, status: v as any })
  }}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Estat" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Tots</SelectItem>
    <SelectItem value="confirmed">✅ Confirmats</SelectItem>
    <SelectItem value="draft">📝 Borrador</SelectItem>
  </SelectContent>
</Select>


      {/* 📅 Filtre per dates */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center">
            <CalendarIcon className="mr-1" /> Setmana
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="block">
              <span>Data Inici</span>
              <input
                type="date"
                className="mt-1 block w-full"
                value={range.start}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
            </label>
            <label className="block mt-2">
              <span>Data Fi</span>
              <input
                type="date"
                className="mt-1 block w-full"
                value={range.end}
                onChange={(e) =>
                  setRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </label>
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRange({ start: '', end: '' })}
              >
                Neteja
              </Button>
              <Button size="sm" onClick={handleApply}>
                Aplica
              </Button>
            </div>
          </motion.div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
