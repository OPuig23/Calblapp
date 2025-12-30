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
  const existingRows = useMemo(
    () => (Array.isArray(item.rows) ? item.rows : []),
    [item.rows]
  )

  const [newRows, setNewRows] = useState<number[]>([])

  const handleAdd = () => {
    setNewRows((prev) => [...prev, Date.now()])
  }

  const handleSavedNewRow = () => {
    setNewRows([])
    onChanged()
  }

  return (
    <div className="space-y-3 p-3">
      {existingRows.map((row, idx) => (
        <VehicleRow
          key={row.id}
          rowIndex={idx}
          eventCode={item.eventCode}
          row={row}
          isNew={false}
          eventDay={item.day}
          eventStartTime={item.eventStartTime}
          eventEndTime={item.eventEndTime}
          onChanged={onChanged}
        />
      ))}

      {newRows.map((key) => (
        <VehicleRow
          key={`new-${key}`}
          eventCode={item.eventCode}
          row={null}
          isNew={true}
          eventDay={item.day}
          eventStartTime={item.eventStartTime}
          eventEndTime={item.eventEndTime}
          onChanged={handleSavedNewRow}
        />
      ))}

      <div className="flex justify-center pt-2">
        <Button variant="outline" className="gap-2" onClick={handleAdd}>
          <Plus size={16} />
          Afegir vehicle
        </Button>
      </div>
    </div>
  )
}
