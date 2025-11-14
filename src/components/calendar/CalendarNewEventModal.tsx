//file: src/components/calendar/CalendarNewEventModal.tsx
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
import SearchFincaInput from '@/components/shared/SearchFincaInput'
import SearchServeiInput from '@/components/shared/SearchServeiInput'
import { useEffect } from 'react'
import { FolderOpen, ExternalLink } from 'lucide-react'
import AttachFileButton from '@/components/calendar/AttachFileButton'

interface Props {
  date: string           // 📅 Data de la casella clicada
  trigger: React.ReactNode
  onSaved?: () => void
}

/**
 * 🆕 CalendarNewEventModal
 * - Crea un nou esdeveniment a la col·lecció stage_verd
 * - Data inicial = data de la casella clicada
 * - Si la finca o el servei no existeixen, els crea automàticament
 */
export default function CalendarNewEventModal({ date, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
interface EventFormData {
  code: string
  LN: string
  NomEvent: string
  DataInici: string
  DataFi?: string      // opcional
  HoraInici?: string   // opcional
  NumPax: string
  Ubicacio: string
  Servei: string
  Comercial: string
}
  // Dades del nou esdeveniment
const [formData, setFormData] = useState<EventFormData>({
  code: '',
  LN: '',
  NomEvent: '',
  DataInici: date || '',
  DataFi: '',        // pot ser buit
  HoraInici: '',     // pot ser buit
  NumPax: '',
  Ubicacio: '',
  Servei: '',
  Comercial: '',
})

  const [files, setFiles] = useState<{ key: string; url: string }[]>([])

  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))
  // Nou estat: permet indicar si l'esdeveniment dura més d’un dia
const [multiDay, setMultiDay] = useState(false)


  // 🔍 Comprova si existeix una finca o servei i el crea si cal
  const ensureExists = async (collection: 'finques' | 'serveis', nom: string) => {
    if (!nom.trim()) return
    try {
      const searchRes = await fetch(`/api/${collection}/search?q=${encodeURIComponent(nom)}`)
      const json = await searchRes.json()
      const exists = Array.isArray(json.data) && json.data.some((i: any) => i.nom === nom)
      if (!exists) {
        await fetch(`/api/${collection}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, codi: `AUTO_${Date.now()}` }),
        })
      }
    } catch (err) {
      console.error(`⚠️ Error comprovant ${collection}:`, err)
    }
  }

  // 🧩 Normalitza ubicació i servei (compatibles amb objecte o string)
const ubicacioValue =
  typeof formData.Ubicacio === 'object' && formData.Ubicacio !== null
    ? ((formData.Ubicacio as Record<string, unknown>)?.nom as string) || ''
    : (formData.Ubicacio as string) || ''

const serveiValue =
  typeof formData.Servei === 'object' && formData.Servei !== null
    ? ((formData.Servei as Record<string, unknown>)?.nom as string) || ''
    : (formData.Servei as string) || ''

// 💾 Desa l'esdeveniment nou reutilitzant /api/calendar/attachments
const handleSave = async () => {
  if (!formData.NomEvent || !formData.Ubicacio) {
    alert('❌ Cal indicar com a mínim Nom i Ubicació.')
    return
  }

  setSaving(true)
  try {
    await ensureExists('finques', ubicacioValue)
await ensureExists('serveis', serveiValue)


    // 🔹 Crea payload segur
    const payload = {
      code: formData.code || '',
      NomEvent: formData.NomEvent || 'Sense nom',
      DataInici: formData.DataInici || new Date().toISOString().slice(0, 10),
      DataFi: formData.DataFi || formData.DataInici || null,
      HoraInici: formData.HoraInici || null,
      NumPax: formData.NumPax || null,
      Ubicacio: ubicacioValue,
      Servei: serveiValue,
      Comercial: formData.Comercial || '',
      LN: formData.LN || 'Altres',
      origen: 'manual',
      collection: 'stage_verd',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log('🧾 enviant payload:', payload)

  const res = await fetch('/api/events/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

    const data = await res.json()
    console.log('📩 resposta backend:', data)

    if (!res.ok) throw new Error(data.error || 'Error backend')

    alert('✅ Esdeveniment creat correctament')
setOpen(false)
onSaved?.() // ja crida reload() al CalendarPage


  } catch (err) {
    console.error('❌ Error creant esdeveniment:', err)
    alert('❌ No s’ha pogut crear l’esdeveniment.')
  } finally {
    setSaving(false)
  }
}
  // 🔁 Neteja el formulari
const handleClear = () => {
  setFormData({
    code: '',
    LN: '',
    NomEvent: '',
    DataInici: date || '',
    DataFi: '',        // 🆕
    HoraInici: '',     // 🆕
    NumPax: '',
    Ubicacio: '',
    Servei: '',
    Comercial: '',
  })
}

// 🟢 Obre automàticament el modal quan rep una data
useEffect(() => {
  if (date) setOpen(true)
}, [date])

// 🗑️ Eliminar un fitxer adjunt
const handleDeleteFile = async (key: string) => {
  if (!confirm('Vols eliminar aquest enllaç del document?')) return

  try {
    // localment només
    setFiles((prev) => prev.filter((f) => f.key !== key))
    alert('🗑️ Enllaç eliminat correctament')
  } catch (err) {
    console.error('❌ Error eliminant enllaç:', err)
    alert('❌ No s’ha pogut eliminar l’enllaç.')
  }
}


  return (
    <Dialog modal={false} open={open} onOpenChange={setOpen}>
      <DialogTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {trigger}
      </DialogTrigger>
<DialogContent
  className="
    w-full 
    max-w-lg 

    /* 📱 Mòbil: modal fullscreen */
    h-[95dvh]
    overflow-y-auto 
    rounded-none

    /* 🖥 Desktop: modal centrat clàssic */
    sm:h-auto
    sm:rounded-lg
    sm:fixed
    sm:top-[50%]
    sm:left-[50%]
    sm:-translate-x-1/2
    sm:-translate-y-1/2
  "
  onClick={(e) => e.stopPropagation()}
>


        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            🆕 Nou esdeveniment
          </DialogTitle>
        </DialogHeader>
<button
  onClick={() => setOpen(false)}
  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 sm:hidden"
>
  ✕
</button>

        <div className="space-y-3 text-sm text-gray-700">
          {/* Línia de negoci */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Línia de negoci</label>
            <select
              value={formData.LN}
              onChange={(e) => handleChange('LN', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">— Selecciona —</option>
              <option value="Empresa">Empresa</option>
              <option value="Casaments">Casaments</option>
              <option value="Grups Restaurants">Grups Restaurants</option>
              <option value="Foodlovers">Foodlovers</option>
              <option value="Agenda">Agenda</option>
              <option value="Altres">Altres</option>
            </select>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom</label>
            <Input
              value={formData.NomEvent}
              onChange={(e) => handleChange('NomEvent', e.target.value)}
              placeholder="Nom de l’esdeveniment"
            />
          </div>

          {/* Codi intern */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Codi</label>
  <Input
    value={formData.code}
    onChange={(e) => handleChange('code', e.target.value)}
    placeholder="Codi intern o de document"
  />
</div>

{/* 🗓️ Data inici */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Data inici</label>
  <Input
    type="date"
    value={formData.DataInici}
    onChange={(e) => handleChange('DataInici', e.target.value)}
  />
</div>

{/* ⏱️ Opció esdeveniment de més d’un dia */}
<div className="flex items-center gap-2 mt-1">
  <input
    type="checkbox"
    checked={multiDay}
    onChange={(e) => {
      setMultiDay(e.target.checked)
      if (!e.target.checked) handleChange('DataFi', '') // neteja DataFi si desmarques
    }}
    id="multiDay"
    className="w-4 h-4"
  />
  <label htmlFor="multiDay" className="text-xs text-gray-600">
    L’esdeveniment dura més d’un dia
  </label>
</div>

{/* 🗓️ Data fi o hora inici segons el cas */}
{multiDay ? (
  <div>
    <label className="block text-xs text-gray-500 mb-1">Data fi</label>
    <Input
      type="date"
      value={formData.DataFi || ''}
      onChange={(e) => handleChange('DataFi', e.target.value)}
    />
  </div>
) : (
  <div>
    <label className="block text-xs text-gray-500 mb-1">Hora inici</label>
    <Input
      type="time"
      value={formData.HoraInici || ''}
      onChange={(e) => handleChange('HoraInici', e.target.value)}
    />
  </div>
)}

          {/* Ubicació */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ubicació</label>
            <SearchFincaInput
              value={formData.Ubicacio}
              onChange={(val) => handleChange('Ubicacio', val)}
            />
          </div>

          {/* Servei */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Servei</label>
            <SearchServeiInput
              value={formData.Servei}
              onChange={(val) => handleChange('Servei', val)}
            />
          </div>

          {/* Comercial */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comercial</label>
            <Input
              value={formData.Comercial}
              onChange={(e) => handleChange('Comercial', e.target.value)}
              placeholder="Nom del comercial"
            />
          </div>

          {/* Nombre de persones */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Núm. de persones</label>
            <Input
              type="number"
              value={formData.NumPax}
              onChange={(e) => handleChange('NumPax', e.target.value)}
              placeholder="Nombre estimat de comensals"
            />
          </div>
        </div>
       {/* 📎 Documents SharePoint */}
<div className="pt-3 border-t mt-4 space-y-3">
  <label className="block text-xs text-gray-500 mb-2">
    📎 Documents de l’esdeveniment (SharePoint)
  </label>

  {/* Botó per adjuntar fitxer */}
  <div className="mt-2">
    <AttachFileButton
  collection="stage_verd"
  docId={`temp-${Date.now()}`}
  onAdded={(att) => {
    setFiles((prev) => {
      const jaExisteix = prev.some((f) => f.url === att.url)
      if (jaExisteix) return prev
      return [...prev, { key: `file${prev.length + 1}`, url: att.url }]
    })
  }}
/>

  </div>

  {/* Llista de fitxers adjuntats */}
  <div className="border rounded-md p-2 bg-gray-50">
    {files.length === 0 ? (
      <p className="text-sm text-gray-400 text-center">
        No hi ha documents afegits
      </p>
    ) : (
      <ul className="space-y-1">
        {files.map(({ key, url }) => (
          <li
            key={`${key}-${url}`}
            className="flex items-center justify-between text-sm bg-white px-2 py-1 rounded-md shadow-sm hover:bg-gray-100"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex-1 break-all flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {decodeURIComponent(url.split('/').pop() || url)}
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 text-xs shrink-0"
              onClick={() => handleDeleteFile(key)}
            >
              🗑️
            </Button>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>
        {/* Botons */}
        <DialogFooter className="mt-4 flex flex-col gap-2">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            💾 Desa esdeveniment
          </Button>
          <Button onClick={handleClear} variant="outline" className="w-full">
            🔄 Neteja
          </Button>
          <Button
            onClick={() => setOpen(false)}
            variant="secondary"
            className="w-full bg-gray-200 hover:bg-gray-300"
          >
            ❌ Cancel·la
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
