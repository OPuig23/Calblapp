// file: src/components/personnel/PersonnelFilters.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  onNewWorker?: () => void
}

export default function PersonnelFilters({
  search,
  onSearchChange,
  onNewWorker,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [roleType, setRoleType] = React.useState('')
  const [isDriver, setIsDriver] = React.useState<'all' | 'yes' | 'no'>('all')

  const handleApply = () => {
    // Aquí només mostrarem, encara sense lògica real.
    console.log('Filtres aplicats:', { roleType, isDriver })
    setOpen(false)
  }

  const handleReset = () => {
    setRoleType('')
    setIsDriver('all')
    onSearchChange('') // ✅ esborra també el nom
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap w-full py-1 px-1">
      {/* 🔍 Cercador per nom */}
      <div className="relative flex-1 min-w-[180px]">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca per nom..."
          className="w-full h-10 rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* ⚙️ Filtres adicionals */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-gray-300 bg-white text-gray-800 flex items-center gap-2 px-3 shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtres</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-800 text-center">
              Filtres adicionals
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 flex flex-col gap-3 pb-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Rol</label>
              <select
                className="h-10 rounded-xl border bg-white px-3"
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
              >
                <option value="">🌐 Tots</option>
                <option value="responsable">Responsable</option>
                <option value="treballador">Treballador</option>
                <option value="conductor">Conductor</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Conductor</label>
              <select
                className="h-10 rounded-xl border bg-white px-3"
                value={isDriver}
                onChange={(e) =>
                  setIsDriver(e.target.value as 'all' | 'yes' | 'no')
                }
              >
                <option value="all">🌐 Tots</option>
                <option value="yes">✅ Sí</option>
                <option value="no">❌ No</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reinicia
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleApply}
            >
              Aplica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {onNewWorker && (
        <Button
          onClick={onNewWorker}
          className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-3 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nou treballador</span>
        </Button>
      )}
    </div>
  )
}
