//file: src/components/calendar/CalendarModal.tsx
'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Deal } from '@/hooks/useCalendarData'

interface Props {
  deal: Deal
  trigger: React.ReactNode
  onSaved?: () => void
}

/**
 * 🪟 CalendarModal
 * Mostra i edita un esdeveniment del calendari.
 * - Verd (Confirmat): editable
 * - Blau / Taronja: només lectura
 */
export default function CalendarModal({ deal, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false)

  // Dades del formulari
  const [editData, setEditData] = useState({
    LN: deal.LN || 'Altres',
    code: deal.code || '',
    NomEvent: deal.NomEvent.split('/')[0].trim(),
    DataInici: deal.DataInici || deal.Data || '',
    NumPax: deal.NumPax || '',
    Ubicacio: deal.Ubicacio || '',
    Servei: deal.Servei || '',
    Comercial: deal.Comercial || '',
  })
  const [initialData] = useState(editData)

  // Només editable si és Confirmat
  const isEditable = deal.StageGroup?.toLowerCase().includes('confirmat')

  // Nom de la col·lecció Firestore
  const colName = deal.collection?.startsWith('stage_')
    ? deal.collection
    : `stage_${deal.collection}`

  // ✏️ Canviar camps
  const handleChange = (field: string, value: string) =>
    setEditData((prev) => ({ ...prev, [field]: value }))

 // 💾 Desa canvis i refresca calendari
const handleSave = async (e?: React.MouseEvent) => {
  e?.stopPropagation() // evita obrir modal nou
  if (!colName) return alert('❌ No s’ha pogut determinar la col·lecció.')

  try {
    const res = await fetch(`/api/calendar/manual/${deal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editData, collection: colName }),
    })
    if (!res.ok) throw new Error('Error desant canvis')

    alert('✅ Canvis desats correctament')
    setOpen(false)
    onSaved?.()

    // ✅ Crida al reload si s’ha passat com a prop
    if (typeof window !== 'undefined') {
      // opcional: recarrega el calendari si l’app ho escolta
      document.dispatchEvent(new CustomEvent('calendar:reload'))
    }

    // Si CalendarModal rep un onSaved (des de CalendarMonthView o WeekView)
    // l’executem directament
    if (typeof (deal as any).onSaved === 'function') {
      ;(deal as any).onSaved()
    }

  } catch (err) {
    console.error('❌ Error desant:', err)
    alert('❌ No s’han pogut desar els canvis.')
  }
}


  // 🗑️ Elimina esdeveniment
  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('Vols eliminar aquest esdeveniment?')) return
    if (!colName) return alert('❌ Falta la col·lecció')

    try {
      const res = await fetch(
        `/api/calendar/manual/${deal.id}?collection=${colName}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Error eliminant')
      alert('🗑️ Esdeveniment eliminat correctament')
      setOpen(false)
      window.dispatchEvent(new Event('calendar-reload'))
    } catch (err) {
      console.error('❌ Error eliminant:', err)
      alert('❌ No s’ha pogut eliminar l’esdeveniment.')
    }
  }

  // 🔁 Restaura canvis
  const handleRestore = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditData(initialData)
    alert('🔁 Canvis restaurats')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger de la targeta (bloqueja propagació per evitar modal nou) */}
      <DialogTrigger
  asChild
  onClick={(e) => {
    // només parem la propagació al calendari, no dins del trigger
    e.stopPropagation()
    setOpen(true)
  }}
>
  {trigger}
</DialogTrigger>


      <DialogContent
        className="max-w-md"
         onClick={(e) => e.stopPropagation()}  
        onInteractOutside={(e) => e.preventDefault()} // evita tancar clicant fora
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editData.NomEvent}
          </DialogTitle>
        </DialogHeader>

        <div
          className="space-y-3 text-sm text-gray-700"
          onClick={(e) => e.stopPropagation()} // ❌ evita qualsevol clic intern que obri modal nou
        >
          {/* Etapa */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Etapa</label>
            <div className="flex items-center gap-2">
              {deal.StageDot && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${deal.StageDot}`}
                  title={deal.StageGroup}
                ></span>
              )}
              <span>{deal.StageGroup || '—'}</span>
            </div>
            {colName && (
              <p className="text-[11px] text-gray-400 italic">
                🗂️ Col·lecció: <span className="font-medium">{colName}</span>
              </p>
            )}
          </div>

          {/* Línia de negoci */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Línia de negoci</label>
  {isEditable ? (
    <select
      value={editData.LN}
      onChange={(e) => handleChange('LN', e.target.value)}
      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
    >
      <option value="Empresa">Empresa</option>
      <option value="Casaments">Casaments</option>
      <option value="Grups Restaurants">Grups Restaurants</option>
      <option value="Foodlovers">Foodlovers</option>
      <option value="Agenda">Agenda</option>
      <option value="Altres">Altres</option>
    </select>
  ) : (
    <p>{deal.LN || '—'}</p>
  )}
</div>

          {/* Nom */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom</label>
            {isEditable ? (
              <Input
                value={editData.NomEvent}
                onChange={(e) => handleChange('NomEvent', e.target.value)}
              />
            ) : (
              <p>{editData.NomEvent}</p>
            )}
          </div>

          {/* Codi */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Codi</label>
            {isEditable ? (
              <Input
                value={editData.code}
                onChange={(e) => handleChange('code', e.target.value)}
              />
            ) : (
              <p>{editData.code || '—'}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data</label>
            {isEditable ? (
              <Input
                type="date"
                value={editData.DataInici}
                onChange={(e) => handleChange('DataInici', e.target.value)}
              />
            ) : (
              <p>{editData.DataInici}</p>
            )}
          </div>

          {/* Num. pax */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Núm. pax</label>
  {isEditable ? (
    <Input
      type="text" // 👈 abans era number
      value={editData.NumPax || ''}
      onChange={(e) => handleChange('NumPax', e.target.value)}
    />
  ) : (
    <p>{editData.NumPax || '—'}</p>
  )}
</div>


          {/* Ubicació */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ubicació</label>
            {isEditable ? (
              <Input
                value={editData.Ubicacio}
                onChange={(e) => handleChange('Ubicacio', e.target.value)}
              />
            ) : (
              <p>{editData.Ubicacio}</p>
            )}
          </div>

{/* Tipus de Servei */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Tipus de Servei</label>
  {isEditable ? (
    <Input
      value={editData.Servei}
      onChange={(e) => handleChange('Servei', e.target.value)}
    />
  ) : (
    <p>{editData.Servei !== '' ? editData.Servei : '—'}</p>
  )}
</div>


          {/* Comercial */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comercial</label>
            {isEditable ? (
              <Input
                value={editData.Comercial}
                onChange={(e) => handleChange('Comercial', e.target.value)}
              />
            ) : (
              <p>{editData.Comercial}</p>
            )}
          </div>
        </div>

        {/* Botons d'acció */}
        <DialogFooter className="mt-4 flex flex-col gap-2">
          {isEditable && (
            <>
              <Button onClick={handleSave} className="w-full">
                💾 Desa canvis
              </Button>
              <Button
                onClick={handleRestore}
                variant="outline"
                className="w-full"
              >
                🔄 Restaurar
              </Button>
            </>
          )}
          <Button
            onClick={handleDelete}
            variant="default"
            className="bg-red-600 hover:bg-red-700 text-white w-full"
          >
            🗑️ Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
