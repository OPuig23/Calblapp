//file: src/components/calendar/CalendarNewEventModal.tsx
'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Save, Trash2 } from 'lucide-react'
import { firestoreClient as db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  defaultDate?: string
  onCreated?: () => void
  autoOpen?: boolean
  existingId?: string
}

export default function CalendarNewEventModal({
  defaultDate,
  onCreated,
  autoOpen,
  existingId,
}: Props) {
  const [open, setOpen] = React.useState(autoOpen || false)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [multiDay, setMultiDay] = React.useState(false)

  const today = defaultDate || new Date().toISOString().slice(0, 10)

  const [form, setForm] = React.useState({
    Code: '',
    LN: '',
    NomEvent: '',
    Comercial: '',
    NumPax: '',
    Ubicacio: '',
    Servei: '',
    DataInici: today,
    DataFi: today,
  })

  React.useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  const handleChange = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
  console.log('🟦 1. Clic detectat: inici del handleSubmit')

  setSaving(true)
  console.log('🟩 2. Estat saving activat')

  try {
    const payload = {
      ...form,
      NumPax: Number(form.NumPax) || 0,
      DataInici: form.DataInici,
      DataFi: multiDay ? form.DataFi : form.DataInici,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'confirmed',
    }

    console.log('📦 3. Payload preparat:', payload)

    console.log('📤 Enviant POST a /api/events/create')
const res = await fetch('/api/events/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

if (!res.ok) {
  const { error } = await res.json().catch(() => ({}))
  throw new Error(error || 'Error desant esdeveniment')
}

const data = await res.json()
console.log('✅ Esdeveniment creat amb ID:', data.id)


    onCreated?.()
    console.log('🔁 5. onCreated executat')

    setTimeout(() => {
      console.log('🚪 6. Modal tancat')
      setOpen(false)
    }, 300)
  } catch (err) {
    console.error('❌ ERROR DESANT:', err.message || err)
    alert('Error desant esdeveniment: ' + (err.message || 'desconegut'))
  } finally {
    console.log('🟨 7. Final del handleSubmit')
    setSaving(false)
  }
}

  const handleDelete = async () => {
    if (!existingId) return
    if (!confirm('Vols eliminar definitivament aquest esdeveniment?')) return
    try {
      setDeleting(true)
     await db.collection('stage_verd').doc(existingId).delete()


      onCreated?.()
      setOpen(false)
    } catch (err) {
      console.error('❌ Error eliminant esdeveniment:', err)
      alert('Error eliminant esdeveniment.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {!autoOpen && (
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <Plus size={16} /> Nou esdeveniment
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0" onInteractOutside={(e) => e.preventDefault()}>

       <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
  <DialogTitle className="text-lg font-semibold text-gray-800">
    {existingId ? 'Editar esdeveniment' : 'Crear nou esdeveniment confirmat'}
  </DialogTitle>
</DialogHeader>



        {/* FORMULARI */}
        <div className="max-h-[70vh] overflow-y-auto px-6 pt-4 pb-8 space-y-4">
          {/* Codi + Línia de negoci */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="Code">Codi</Label>
              <Input
                id="Code"
                placeholder="Ex: E-2501"
                value={form.Code}
                onChange={(e) => handleChange('Code', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="LN">Línia de negoci</Label>
              <Select
                value={form.LN}
                onValueChange={(v) => handleChange('LN', v)}
              >
                <SelectTrigger id="LN">
                  <SelectValue placeholder="Selecciona línia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casament">Casament</SelectItem>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Foodlover">Foodlover</SelectItem>
                  <SelectItem value="Agenda">Agenda</SelectItem>
                  <SelectItem value="Restauració">Restauració</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="NomEvent">Nom de l'esdeveniment</Label>
            <Input
              id="NomEvent"
              placeholder="Ex: Boda Anna & Marc"
              value={form.NomEvent}
              onChange={(e) => handleChange('NomEvent', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="Comercial">Comercial / Responsable</Label>
            <Input
              id="Comercial"
              placeholder="Nom del comercial"
              value={form.Comercial}
              onChange={(e) => handleChange('Comercial', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="NumPax">Nombre de PAX</Label>
            <Input
              id="NumPax"
              type="number"
              placeholder="Ex: 120"
              value={form.NumPax}
              onChange={(e) => handleChange('NumPax', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="Ubicacio">Ubicació (finca)</Label>
            <Input
              id="Ubicacio"
              placeholder="Ex: Masia Blayet"
              value={form.Ubicacio}
              onChange={(e) => handleChange('Ubicacio', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="Servei">Tipus de servei</Label>
            <Input
              id="Servei"
              placeholder="Ex: Casament, Sopar empresa..."
              value={form.Servei}
              onChange={(e) => handleChange('Servei', e.target.value)}
            />
          </div>

          {/* 📅 Dates */}
          <div className="space-y-2">
            <div>
              <Label>Data d'inici</Label>
              <Input
                type="date"
                value={form.DataInici}
                readOnly
                className="bg-gray-100 cursor-not-allowed text-gray-500"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Switch checked={multiDay} onCheckedChange={setMultiDay} />
              <Label className="text-sm">Esdeveniment de diversos dies</Label>
            </div>

            {multiDay && (
              <div className="mt-2">
                <Label>Data de finalització</Label>
                <Input
                  type="date"
                  value={form.DataFi}
                  onChange={(e) => handleChange('DataFi', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTONS INFERIORS */}
<form
  onSubmit={(e) => {
    e.preventDefault()
    handleSubmit()
  }}
  className="sticky bottom-0 left-0 w-full bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-lg"
>
  {existingId ? (
    <Button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      variant="ghost"
      className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md"
    >
      <Trash2 size={16} />
      {deleting ? 'Eliminant...' : 'Eliminar'}
    </Button>
  ) : (
    <div />
  )}

  <Button
    type="submit"
    disabled={saving}
    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-5 py-2"
  >
    <Save size={16} /> {saving ? 'Desant...' : 'Guardar esdeveniment'}
  </Button>
</form>


      </DialogContent>
    </Dialog>
  )
}
