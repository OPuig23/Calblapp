// File: src/components/transports/NewTransportModal.tsx
'use client'

import React, { useState, useEffect, FormEvent, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateTransport } from '@/hooks/useCreateTransport'
import { usePersonnel } from '@/hooks/usePersonnel'
import type { Transport } from '@/hooks/useTransports'

// ⚠️ Assumim que tens aquest helper per Firebase client
// Si no el tens, després el fem: exporta almenys `storage`
import { storage } from '@/lib/firebaseClient'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'

type TransportType = 'camioPetit' | 'camioGran' | 'furgoneta'

const isTransportType = (v: string): v is TransportType =>
  v === 'camioPetit' || v === 'camioGran' || v === 'furgoneta'

const TYPE_OPTIONS: Array<{ value: TransportType; label: string }> = [
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'furgoneta', label: 'Furgoneta' },
]

interface Personnel {
  id: string
  name: string
  driver?: { camioGran?: boolean; camioPetit?: boolean }
}
// ✨ AFEGEIX AIXÒ A DALT (abans del component)
type TransportPayload = {
  plate: string
  type: TransportType
  conductorId: string | null

  itvDate: string | null
  itvExpiry: string | null
  lastService: string | null
  nextService: string | null

  documents: string[]   // URLs de Firebase
}




interface NewTransportModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  defaultValues?: Transport | null
}

type TransportDocument = {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export default function NewTransportModal({
  isOpen,
  onOpenChange,
  onCreated,
  defaultValues = null,
}: NewTransportModalProps) {
  const { mutateAsync, loading, error } = useCreateTransport()
  const { data: personnel } = usePersonnel()

  const isEditMode = !!defaultValues

  const [plate, setPlate] = useState('')
  const [type, setType] = useState<TransportType>('camioPetit')
  const [conductorId, setConductorId] = useState<string>('')

  // 🔹 Camps nous
  const [itvDate, setItvDate] = useState<string>('')
  const [itvExpiry, setItvExpiry] = useState<string>('')
  const [lastService, setLastService] = useState<string>('')
  const [nextService, setNextService] = useState<string>('')

  const [documents, setDocuments] = useState<TransportDocument[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 🔄 Quan s’obre el modal, carreguem valors (mode edició / creació)
  useEffect(() => {
    if (!isOpen) return

    if (isEditMode && defaultValues) {
      setPlate(defaultValues.plate || '')
      setType(defaultValues.type || 'camioPetit')
      setConductorId(defaultValues.conductorId || '')

      setItvDate(defaultValues.itvDate || '')
      setItvExpiry(defaultValues.itvExpiry || '')
      setLastService(defaultValues.lastService || '')
      setNextService(defaultValues.nextService || '')

      setDocuments(defaultValues.documents || [])
    } else {
      // Mode creació
      setPlate('')
      setType('camioPetit')
      setConductorId('')
      setItvDate('')
      setItvExpiry('')
      setLastService('')
      setNextService('')
      setDocuments([])
    }
  }, [isOpen, isEditMode, defaultValues])

  // 🔎 Filtra conductors segons tipus de vehicle
const availableDrivers = useMemo(() => {
  if (!personnel) return []

  return personnel.filter((p) => {
    // Alguns treballadors no tenen objecte driver
    if (!p.driver) return false

    if (type === 'camioGran') return p.driver.camioGran === true
    if (type === 'camioPetit' || type === 'furgoneta') return p.driver.camioPetit === true

    return false
  })
}, [type, personnel])


  // 📁 Obrir selector d'arxius
  const handleOpenFileDialog = () => {
    fileInputRef.current?.click()
  }

  // 📁 Validació i pujada d'un arxiu a Firebase Storage
  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || !files.length) return

    const now = new Date().toISOString()

    for (const file of Array.from(files)) {
      // 1) Validar mida
      if (file.size > 5 * 1024 * 1024) {
        alert(`El fitxer ${file.name} supera els 5MB.`)
        continue
      }

      // 2) Validar tipus
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
      ]
      if (!validTypes.includes(file.type)) {
        alert(`Tipus de fitxer no permès: ${file.name}`)
        continue
      }

      try {
        const safePlate = plate || defaultValues?.plate || 'sense-matricula'
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const storagePath = `transports/${safePlate}/${id}-${file.name}`

        const fileRef = ref(storage, storagePath)
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)

        const doc: TransportDocument = {
          id,
          name: file.name,
          url,
          uploadedAt: now,
        }

        setDocuments(prev => [...prev, doc])
      } catch (err) {
        console.error('❌ Error pujant document:', err)
        alert(`No s’ha pogut pujar el fitxer ${file.name}.`)
      }
    }

    // Netejar input (per poder tornar a seleccionar el mateix fitxer si cal)
    event.target.value = ''
  }

  // 🗑 Eliminar document (només del llistat i, si vols, de Storage)
  const handleRemoveDocument = async (doc: TransportDocument) => {
    const confirmDelete = window.confirm(
      `Vols eliminar el document "${doc.name}"?`
    )
    if (!confirmDelete) return

    try {
      // Opcional: si vols eliminar també de Storage cal conèixer el path exacte.
      // Aquí assumim que la URL conté el path encodat.
      // Per no fer-ho massa complex, de moment només traiem del state.
      // (Si vols, fem després un pas específic per esborrar també de Storage.)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      console.error('❌ Error eliminant document:', err)
      alert('No s’ha pogut eliminar el document.')
    }
  }

  // 💾 Guardar / Actualitzar transport
// 💾 Guardar / Actualitzar transport
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()

  // 👉 AFEGIT AQUÍ
  interface TransportPayload {
    plate: string
    type: TransportType
    conductorId: string | null
    itvDate: string | null
    serviceDate: string | null
    nextServiceDate: string | null
    documents: string[]
  }

  // 👉 MODIFICAT AQUÍ
const payload: TransportPayload = {
  plate: plate.trim(),
  type,
  conductorId: conductorId || null,

  itvDate: itvDate || null,
  itvExpiry: itvExpiry || null,
  lastService: lastService || null,
  nextService: nextService || null,

 documents: documents.map(d => d.url), 
}
    try {
      if (isEditMode && defaultValues?.id) {
        const res = await fetch(`/api/transports/${defaultValues.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Error actualitzant transport')
      } else {
        await mutateAsync(payload)
      }

      onCreated()
      onOpenChange(false)
    } catch (err) {
      console.error('❌ Error desant transport:', err)
      alert('No s’ha pogut desar el vehicle.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEditMode ? 'Editar transport' : 'Nou transport'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bloc 1: Dades bàsiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matrícula */}
            <div className="space-y-1.5">
              <Label htmlFor="plate">Matrícula</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="Ex: 7447 MHX"
                required
              />
            </div>

            {/* Tipus */}
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipus de vehicle</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  const v = e.target.value
                  if (isTransportType(v)) setType(v)
                }}
                className="border rounded-md px-2 py-2 w-full text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conductor */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="conductorId">Conductor (opcional)</Label>
              <select
                id="conductorId"
                value={conductorId}
                onChange={(e) => setConductorId(e.target.value)}
                className="border rounded-md px-2 py-2 w-full text-sm"
              >
                <option value="">— Sense conductor assignat —</option>
                {availableDrivers.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bloc 2: ITV */}
          <div className="border rounded-xl p-3 bg-slate-50 space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              ITV
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="itvDate">Data ITV</Label>
                <Input
                  id="itvDate"
                  type="date"
                  value={itvDate || ''}
                  onChange={(e) => setItvDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="itvExpiry">Caducitat ITV</Label>
                <Input
                  id="itvExpiry"
                  type="date"
                  value={itvExpiry || ''}
                  onChange={(e) => setItvExpiry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bloc 3: Revisió */}
          <div className="border rounded-xl p-3 bg-slate-50 space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Revisió
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lastService">Última revisió</Label>
                <Input
                  id="lastService"
                  type="date"
                  value={lastService || ''}
                  onChange={(e) => setLastService(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextService">Properà revisió</Label>
                <Input
                  id="nextService"
                  type="date"
                  value={nextService || ''}
                  onChange={(e) => setNextService(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bloc 4: Documentació */}
          <div className="border rounded-xl p-3 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Documentació del vehicle
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenFileDialog}
              >
                Adjuntar document
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500">
                Encara no hi ha cap document adjunt.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto text-sm">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white border px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[180px]">
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(doc.uploadedAt).toLocaleDateString('ca-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Obrir
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botons finals */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel·lar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading
                ? 'Desant…'
                : isEditMode
                ? 'Desar canvis'
                : 'Afegir transport'}
            </Button>
          </div>

          {error && (
            <p className="text-red-600 text-sm">
              {String(error)}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
