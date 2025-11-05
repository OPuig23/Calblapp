// ✅ file: src/components/quadrants/WeeklyFilters.tsx
'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { firestoreClient } from '@/lib/firebase'

interface WeeklyFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (filters: SmartFiltersChange) => void
  start?: string
  end?: string
  fixedDepartment?: string
   role?: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador' // 🔹 afegit
}
interface WeeklyFiltersChange {
  [key: string]: unknown
  responsable?: string
  finca?: string
}


/**
 * 🧭 WeeklyFilters – Filtres setmanals millorats
 * ---------------------------------------------
 * - 100 % Mobile-first
 * - Mostra responsables i finques dins el rang seleccionat
 * - Sense filtres de confirmat/borrador
 */
export default function WeeklyFilters({
  open,
  onOpenChange,
  onChange,
  start,
  end,
  fixedDepartment = 'serveis',
}: WeeklyFiltersProps) {
  const [responsables, setResponsables] = useState<string[]>([])
  const [finques, setFinques] = useState<string[]>([])
  const [selectedResponsable, setSelectedResponsable] = useState('')
  const [selectedFinca, setSelectedFinca] = useState('')

  // 🔹 Carrega responsables i finques dins del rang setmanal
  useEffect(() => {
  if (!start || !end) return

  const fetchResponsablesIFinques = async () => {
    try {
      const colName =
        'quadrants' +
        fixedDepartment.charAt(0).toUpperCase() +
        fixedDepartment.slice(1)

      const snapshot = await firestoreClient.collection(colName).get()
      const respSet = new Set<string>()
      const fincaSet = new Set<string>()

      const startRange = new Date(start)
      const endRange = new Date(end)

      snapshot.forEach((doc) => {
        const data = doc.data() as Record<string, unknown>

        const startDateValue =
          data.startDate instanceof Date
            ? data.startDate
            : new Date(String(data.startDate))
        const endDateValue =
          data.endDate instanceof Date
            ? data.endDate
            : new Date(String(data.endDate))

        const inRange =
          startDateValue <= endRange && endDateValue >= startRange

        if (inRange) {
          const responsableName =
            typeof data.responsable === 'string'
              ? data.responsable
              : (data.responsable as { name?: string })?.name ?? ''
          const location =
            (data.location as string) || (data.finca as string) || ''

          if (responsableName.trim()) respSet.add(responsableName.trim())
          if (location.trim()) fincaSet.add(location.trim())
        }
      })

      setResponsables(Array.from(respSet))
      setFinques(Array.from(fincaSet))
    } catch (err) {
      console.error('[WeeklyFilters] Error carregant dades:', err)
    }
  }

  fetchResponsablesIFinques()
}, [start, end, fixedDepartment])


  // 🔸 Quan canviïn els filtres, els propaguem
// 🔸 Quan canviïn els filtres, els propaguem
const handleFiltersChange = (f: WeeklyFiltersChange) => {
  const updatedFilters: WeeklyFiltersChange = {
    ...f,
    responsable: selectedResponsable,
    finca: selectedFinca,
  }
 onChange(updatedFilters as unknown as SmartFiltersChange)

}
  // 🖼️ Render
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="w-screen h-[100dvh] bg-white rounded-t-3xl p-6 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-emerald-700">
            Filtres setmanals
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 🔹 SmartFilters bàsic (setmana, departament, etc.) */}
          <SmartFilters
  modeDefault="week"
  role="Cap Departament"
  fixedDepartment={fixedDepartment}
  showDepartment
  showWorker={false}
  showLocation={false}
  showStatus={false}
  showImportance={false}
  onChange={handleFiltersChange}
/>


          {/* 🔹 Responsable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <select
              value={selectedResponsable}
              onChange={(e) => setSelectedResponsable(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Tots</option>
              {responsables.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* 🔹 Finca / Ubicació */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Finca / Ubicació
            </label>
            <select
              value={selectedFinca}
              onChange={(e) => setSelectedFinca(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Totes</option>
              {finques.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 🔘 Botó inferior mòbil */}
        <div className="flex justify-end mt-10 pb-4">
          <Button
            onClick={() => {
              handleFiltersChange({} as SmartFiltersChange)
              onOpenChange(false)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2 text-sm w-full sm:w-auto shadow"
          >
            Aplicar filtres
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
