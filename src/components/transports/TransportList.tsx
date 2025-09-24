'use client'

import React from 'react'
import { Transport } from '@/hooks/useTransports'
import { usePersonnel } from '@/hooks/usePersonnel'
import { TransportCard } from './TransportCard'

interface Props {
  transports: Transport[]
  onEdit: (t: Transport) => void
  onDelete: (t: Transport) => void
}

export default function TransportList({ transports, onEdit, onDelete }: Props) {
  const { data: personnel } = usePersonnel()

  const getDriverName = (id?: string | null) => {
    if (!id || !personnel) return null
    return personnel.find((p) => p.id === id)?.name || null
  }

  if (!transports?.length) {
    return (
      <div className="text-gray-500 italic text-center py-8">
        No hi ha transports registrats.
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {transports.map((t) => (
        <TransportCard
          key={t.id}
          transport={t}
          driverName={getDriverName(t.conductorId)}
          onEdit={() => onEdit(t)}
          onDelete={() => onDelete(t)}
        />
      ))}
    </div>
  )
}
