//file:/src/app/menu/logistica/assignacions/components/VehiclesTable.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VehicleRow from './VehicleRow'


interface Props {
  item: any
  onChanged: () => void
}


export default function VehiclesTable({ item, onChanged }: Props) {
  /* =========================
     FILES EXISTENTS (Firestore)
     - venen del backend
     - NO es modifiquen aquí
  ========================= */
  const existingRows = useMemo(() => {
    return Array.isArray(item.rows) ? item.rows : []
  }, [item.rows])

  /* =========================
     FILES NOVES (UI only)
     - encara NO existeixen a Firestore
     - NO porten id
  ========================= */
  const [newRows, setNewRows] = useState<number[]>([])

  const handleAdd = () => {
    setNewRows((prev) => [...prev, Date.now()])
  }

  const handleSavedNewRow = () => {
    // quan una fila nova es desa correctament:
    // 1) la traiem de la UI
    // 2) refresquem dades reals des de backend
    setNewRows([])
    onChanged()
  }

  return (
    <div className="space-y-3 p-3">
      {/* =========================
          FILES EXISTENTS
      ========================= */}
      {existingRows.map((row) => (
        <VehicleRow
          key={row.id}
          eventCode={item.eventCode}
          row={row}
          isNew={false}
          eventDay={item.day}
          eventStartTime={item.eventStartTime}
          eventEndTime={item.eventEndTime}
          onChanged={onChanged}
        />
      ))}

      {/* =========================
          FILES NOVES
      ========================= */}
      {newRows.map((key) => (
        <VehicleRow
          key={`new-${key}`}      // ⚠️ només per React
          eventCode={item.eventCode}
          row={null}              // 👈 CRÍTIC: no hi ha row
          isNew={true}
          eventDay={item.day}
          eventStartTime={item.eventStartTime}
          eventEndTime={item.eventEndTime}
          onChanged={handleSavedNewRow}
        />
      ))}

      {/* =========================
          BOTÓ AFEGIR
      ========================= */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleAdd}
        >
          <Plus size={16} />
          Afegir vehicle
        </Button>
      </div>
    </div>
  )
}
