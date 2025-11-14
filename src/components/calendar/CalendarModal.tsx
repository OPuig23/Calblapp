// file: src/components/calendar/CalendarModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
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
import { FolderOpen, ExternalLink, Plus } from 'lucide-react'
import SearchFincaInput from '@/components/shared/SearchFincaInput'
import SearchServeiInput from '@/components/shared/SearchServeiInput'
import SharePointFilePicker from '@/components/shared/SharePointFilePicker'
import AttachFileButton from '@/components/calendar/AttachFileButton'

interface Props {
  deal: Deal
  trigger: React.ReactNode
  onSaved?: () => void
   readonly?: boolean
}

/**
 * CalendarModal (consulta i enllaços SharePoint)
 * - No puja fitxers. Guarda enllaços (file1, file2, ...)
 * - Llista enllaços guardats i permet obrir-los / eliminar-los
 * - Manté l’edició de camps bàsics si l’esdeveniment és Confirmat
 * 
 */
export default function CalendarModal({ deal, trigger, onSaved }: Props) {
    console.log('🧩 Dades rebudes al modal:', deal)

  const [open, setOpen] = useState(false)

// ✅ Dades del formulari de l’esdeveniment

const get = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const foundKey = Object.keys(obj || {}).find(
      (key) => key.toLowerCase() === k.toLowerCase()
    )
    if (foundKey) return obj[foundKey]
  }
  return undefined
}

const [editData, setEditData] = useState(() => ({
  LN: get(deal, 'LN', 'ln', 'liniaNegoci') || 'Altres',
  code: get(deal, 'code', 'C_digo', 'codi') || '',
  NomEvent: get(deal, 'NomEvent', 'nomEvent', 'summary') || '',
  DataInici: get(deal, 'DataInici', 'dataInici', 'Data', 'dateStart') || '',
  DataFi: get(deal, 'DataFi', 'dataFi', 'dateEnd') || '',
  NumPax: get(deal, 'NumPax', 'numPax', 'pax') || '',
  Ubicacio: get(deal, 'Ubicacio', 'ubicacio', 'location') || '',
  Servei: get(deal, 'Servei', 'servei', 'service') || '',
  Comercial: get(deal, 'Comercial', 'comercial', 'responsable') || '',
}))


// Guarda una còpia per poder fer reset si cal
const [initialData, setInitialData] = useState(editData)

// 🧩 Sincronitza el formulari quan canviï el deal (p. ex. al obrir un nou esdeveniment)
useEffect(() => {
  // 🧩 Funció per recuperar un camp sense importar majúscules/minúscules
  const get = (obj: any, ...keys: string[]) => {
    for (const k of keys) {
      const foundKey = Object.keys(obj || {}).find(
        (key) => key.toLowerCase() === k.toLowerCase()
      )
      if (foundKey) return obj[foundKey]
    }
    return undefined
  }

  const NomEventRaw = get(deal, 'NomEvent', 'nomEvent', 'summary') || ''
  const LN = get(deal, 'LN', 'ln', 'liniaNegoci') || 'Altres'
 const Servei = get(deal, 'Servei', 'servei', 'service', 'TipusServei', 'tipusservei') || ''
const Comercial = get(deal, 'Comercial', 'comercial', 'responsable', 'salesperson', 'Salesperson') || ''
const NumPax = get(deal, 'NumPax', 'numPax', 'pax', 'Num_Pax', 'num_pax', 'PAX') || ''

  const Ubicacio = get(deal, 'Ubicacio', 'ubicacio', 'location') || ''
  const Code = get(deal, 'code', 'C_digo', 'codi') || ''
  const DataInici = get(deal, 'DataInici', 'dataInici', 'Data', 'dateStart') || ''
  const DataFi = get(deal, 'DataFi', 'dataFi', 'dateEnd') || ''
console.log('📊 Extracte camps:', {
  NomEvent: deal.NomEvent,
  Comercial: deal.Comercial,
  Servei: deal.Servei,
  NumPax: deal.NumPax,
  LN: deal.LN,
  origen: deal.origen,
  collection: deal.collection,
})


  setEditData({
    LN,
    code: Code,
    NomEvent: NomEventRaw.split('/')[0].trim(),
    DataInici,
    DataFi,
    NumPax,
    Ubicacio,
    Servei,
    Comercial,
  })

  setInitialData({
    LN,
    code: Code,
    NomEvent: NomEventRaw.split('/')[0].trim(),
    DataInici,
    DataFi,
    NumPax,
    Ubicacio,
    Servei,
    Comercial,
  })
}, [deal])

  // Fitxers (file1, file2, ...) llegits del deal
  const [files, setFiles] = useState<{ key: string; url: string }[]>([])
  const [newFileUrl, setNewFileUrl] = useState('')

  // Només editable si és Confirmat
const isZohoVerd = ['verd', 'stage_verd'].includes(deal?.collection || '') && deal.origen === 'zoho'
const isManual = deal.origen !== 'zoho'






  // Nom de la col·lecció Firestore
  const colName = deal.collection?.startsWith('stage_')
    ? deal.collection
    : `stage_${deal.collection}`

  // Carpeta base SharePoint (compartida)
  const baseFolder =
    'https://calblayrest.sharepoint.com/sites/EsdevenimentsCalBlay/Documents%20compartits/Esdeveniments'

  // Inicialitza llistat de fileN del deal
  useEffect(() => {
     console.log('🟢 DEAL COMPLET rebut al modal:', deal)
    const loaded = Object.entries(deal)
      .filter(([k, v]) => k.startsWith('file') && typeof v === 'string' && (v as string).length > 0)
      .sort((a, b) => {
        // ordena per índex numèric: file1, file2, ...
        const ai = parseInt(a[0].replace('file', ''), 10)
        const bi = parseInt(b[0].replace('file', ''), 10)
        return ai - bi
      })
      .map(([key, url]) => ({ key, url: url as string }))
    setFiles(loaded)
  }, [deal])

  // Helpers
  const handleChange = (field: string, value: string) =>
    setEditData((prev) => ({ ...prev, [field]: value }))

  const findNextFileKey = (currentKeys: string[]) => {
    // troba el primer fileN lliure (p. ex. si hi ha file1 i file3, torna file2)
    const used = new Set(
      currentKeys
        .filter((k) => k.startsWith('file'))
        .map((k) => parseInt(k.replace('file', ''), 10))
        .filter((n) => !Number.isNaN(n))
    )
    let i = 1
    while (used.has(i)) i++
    return `file${i}`
  }

  // 💾 Desa canvis generals de l’esdeveniment
const handleSave = async (e?: React.MouseEvent) => {
  e?.stopPropagation()

  try {
    const payload: Record<string, any> = {
      ...editData,
      collection: 'stage_verd',
      updatedAt: new Date().toISOString(),
    }

    if (newFileUrl?.trim()) {
      payload.file1 = newFileUrl.trim()
    }

    const res = await fetch(`/api/calendar/manual/${deal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error('Error desant dades')

    // ✅ Actualitza la llista local immediatament
    if (newFileUrl?.trim()) {
      const fileKey = `file${files.length + 1}`
      setFiles((prev) => [...prev, { key: fileKey, url: newFileUrl.trim() }])
    }

    alert('✅ Canvis desats correctament')
    setOpen(false)
    onSaved?.()
    document.dispatchEvent(new CustomEvent('calendar:reload'))
  } catch (err) {
    console.error('❌ Error desant:', err)
    alert('❌ No s’han pogut desar els canvis.')
  }
}

  // ➕ Afegir un nou enllaç (fileN) a Firestore
  const handleAddFile = async () => {
    const url = newFileUrl.trim()
    if (!url) return alert('Introdueix una URL vàlida de SharePoint')
    const nextKey = findNextFileKey(files.map((f) => f.key))

    try {
      const payload = { [nextKey]: url, collection: colName }
      const res = await fetch(`/api/calendar/manual/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error desant l’enllaç')

      setFiles((prev) => [...prev, { key: nextKey, url }])
      setNewFileUrl('')
      alert('✅ Enllaç afegit correctament')
      onSaved?.()
    } catch (err) {
      console.error('❌ Error afegint enllaç:', err)
      alert('❌ No s’ha pogut afegir l’enllaç.')
    }
  }

  // 🗑️ Eliminar un enllaç (fileN) de Firestore
  const handleDeleteFile = async (key: string) => {
    if (!confirm('Vols eliminar aquest enllaç del document?')) return

    try {
      const payload: Record<string, any> = { collection: colName }
      payload[key] = null // elimina el camp
      const res = await fetch(`/api/calendar/manual/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error eliminant l’enllaç')

      setFiles((prev) => prev.filter((f) => f.key !== key))
      alert('🗑️ Enllaç eliminat correctament')
      onSaved?.()
    } catch (err) {
      console.error('❌ Error eliminant enllaç:', err)
      alert('❌ No s’ha pogut eliminar l’enllaç.')
    }
  }

  // 🗑️ Elimina TOT l’esdeveniment
  const handleDeleteEvent = async (e?: React.MouseEvent) => {
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
document.dispatchEvent(new CustomEvent('calendar:reload'))
onSaved?.()

    } catch (err) {
      console.error('❌ Error eliminant:', err)
      alert('❌ No s’ha pogut eliminar l’esdeveniment.')
    }
  }

  // 🔁 Restaura canvis locals no desats
  const handleRestore = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditData(initialData)
    alert('🔁 Canvis restaurats')
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
            {editData.NomEvent || 'Esdeveniment'}
          </DialogTitle>
        </DialogHeader>
        <button
  onClick={() => setOpen(false)}
  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 sm:hidden"
>
  ✕
</button>


        <div className="space-y-3 text-sm text-gray-700">
          {/* Etapa */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Etapa</label>
            <span>{deal.StageGroup || '—'}</span>
          </div>

          {/* Línia de negoci */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Línia de negoci</label>
            {isManual ? (
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
            {isManual ? (
              <Input
                value={editData.NomEvent}
                onChange={(e) => handleChange('NomEvent', e.target.value)}
              />
            ) : (
              <p>{editData.NomEvent}</p>
            )}
          </div>
          {/* Codi (només editable per stage_verd o manual) */}
{(isZohoVerd || isManual) ? (
  <div>
    <label className="block text-xs text-gray-500 mb-1">Codi</label>
    <Input
      value={editData.code}
      onChange={(e) => handleChange('code', e.target.value)}
      placeholder="Codi intern o de document"
    />
    
  </div>
) : (
  editData.code && (
    <div>
      <label className="block text-xs text-gray-500 mb-1">Codi</label>
      <p>{editData.code}</p>
    </div>
  )
)}
          {/* Data */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data</label>
            {isManual ? (
              <Input
                type="date"
                value={editData.DataInici}
                onChange={(e) => handleChange('DataInici', e.target.value)}
              />
            ) : (
              <p>{editData.DataInici}</p>
            )}
          </div>
          {/* Data fi (només si és diferent) */}
{editData.DataFi && editData.DataFi !== editData.DataInici && (
  <div>
    <label className="block text-xs text-gray-500 mb-1">Data fi</label>
    <p>{editData.DataFi}</p>
  </div>
)}

          {/* Ubicació */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ubicació</label>
            {isManual ? (
             <SearchFincaInput
  value={editData.Ubicacio}
  onChange={(val) => {
    console.log('Ubicació seleccionada:', val)
    handleChange('Ubicacio', val)
  }}
/>

            ) : (
              <p>{editData.Ubicacio || '—'}</p>
            )}
          </div>

          {/* Servei */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipus de Servei</label>
            {isManual ? (
              <SearchServeiInput
                value={editData.Servei}
                onChange={(val) => handleChange('Servei', val)}
              />
            ) : (
              <p>{editData.Servei || '—'}</p>
            )}
          </div>
{/* Nombre de convidats */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Nombre de Pax</label>
  {isManual ? (
    <div className="relative">
      <Input
        type="number"
        value={editData.NumPax}
        onChange={(e) => handleChange('NumPax', e.target.value)}
        className="pr-12" // espai per a "Pax"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
        Pax
      </span>
    </div>
  ) : (
    <p>{editData.NumPax ? `${editData.NumPax} Pax` : '—'}</p>
  )}
</div>



          {/* Comercial */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comercial</label>
            {isManual ? (
              <Input
                value={editData.Comercial}
                onChange={(e) => handleChange('Comercial', e.target.value)}
              />
            ) : (
              <p>{editData.Comercial || '—'}</p>
            )}
          </div>



{/* 📎 Adjuntar fitxer des de SharePoint */}
{(isZohoVerd || isManual) && (

  <div className="pt-3 border-t mt-4 space-y-3">
    <label className="block text-xs text-gray-500 mb-2">
      📎 Documents de l’esdeveniment (SharePoint)
    </label>

    <div className="mt-2">
      <AttachFileButton
        collection={colName as 'stage_verd' | 'stage_taronja' | 'stage_blau'}
        docId={deal.id}
        onAdded={(att) => {
          setFiles((prev) => [
            ...prev,
            { key: `file${prev.length + 1}`, url: att.url },
          ])
        }}
      />
    </div>
  </div>
)}


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

            {/* Botons d’acció */}
        <DialogFooter className="mt-4 flex flex-col gap-2">
          {(isZohoVerd || isManual) && (

            <>
              <Button onClick={handleSave} className="w-full">
                💾 Desa canvis
              </Button>
              <Button onClick={handleRestore} variant="outline" className="w-full">
                🔄 Restaurar
              </Button>
            </>
          )}
          <Button
            onClick={handleDeleteEvent}
            variant="default"
            className="bg-red-600 hover:bg-red-700 text-white w-full"
          >
            🗑️ Eliminar esdeveniment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
