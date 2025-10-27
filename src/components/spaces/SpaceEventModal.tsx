'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { COLORS_LN } from '@/lib/colors'

interface SpaceEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: any | null
}

/**
 * 🔹 Modal de lectura d'esdeveniment (Espais)
 * 100% mobile-first, només lectura. Mostra dades bàsiques del Firestore.
 * Inclou color de LN segons definició a /lib/colors.ts
 */
export default function SpaceEventModal({ open, onOpenChange, event }: SpaceEventModalProps) {
  if (!event) return null

  // Normalitza LN i obté color
  const lnName = event.LN || event.ln || 'Sense LN'
  const lnKey = lnName.toLowerCase().trim()
  const lnColor = COLORS_LN?.[lnKey] || 'bg-gray-200 text-gray-700'

  // Assegurem que el camp code es llegeix correctament
 const eventCode = event.code || event.Code || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            {event.NomEvent || event.eventName || 'Esdeveniment'}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {event.Ubicacio || 'Sense ubicació definida'}
          </p>
        </DialogHeader>

        <div className="mt-3 space-y-2 text-[13px] sm:text-sm">
          {/* Línia de negoci amb color */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Línia de Negoci:</span>
            <Badge
              className={`${lnColor} border border-gray-200 shadow-sm font-medium px-2 py-1 text-[12px]`}
            >
              {lnName}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Comercial:</span>
            <span>{event.Comercial || event.commercial || '-'}</span>
          </div>

          <div className="flex justify-between">
  <span className="text-gray-500">Servei:</span>
  <span>{event.Servei || event.service || '-'}</span>
</div>


          <div className="flex justify-between">
            <span className="text-gray-500">Codi:</span>
            <span>{eventCode}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Data Inici:</span>
            <span>{event.DataInici || event.date || '-'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Hora Inici:</span>
            <span>{event.HoraInici || event.startTime || '-'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Ubicació:</span>
            <span>{event.Ubicacio || '-'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Pax:</span>
            <span className="font-semibold text-gray-700">
              {event.NumPax ?? event.numPax ?? 0}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
