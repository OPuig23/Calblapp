//file: src/components/calendar/CalendarModal.tsx
'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Deal } from '@/hooks/useCalendarData'

interface Props {
  deal: Deal
  trigger: React.ReactNode
}

/**
 * 🪟 CalendarModal
 * Mostra els detalls d’un esdeveniment (Deal) del calendari.
 */
export default function CalendarModal({ deal, trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{deal.NomEvent}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>Servei:</strong> {deal.Servei}
          </p>
          <p>
            <strong>Ubicació:</strong> {deal.Ubicacio || '—'}
          </p>
          <p>
            <strong>Comercial:</strong> {deal.Comercial || '—'}
          </p>
          <p>
            <strong>Data:</strong> {deal.Data || '—'}
          </p>
          {deal.Menu && deal.Menu.length > 0 && (
            <p>
              <strong>Menú:</strong> {deal.Menu.join(', ')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
