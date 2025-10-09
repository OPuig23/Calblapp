// filename: src/components/events/CreateModificationModal.tsx
'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import categories from '@/data/modificationCategories.json'

/* ───────────────────────── Tipus ───────────────────────── */
interface CategoryOpt {
  id: string
  label: string
}
interface Props {
  event: { id?: string | number; summary: string }
  user: { name?: string; department?: string }
  onClose: () => void
  onCreated?: (id?: string) => void
}

/* ───────────────────────── Component ───────────────────────── */
export default function CreateModificationModal({
  event,
  user,
  onClose,
  onCreated,
}: Props) {
  const [description, setDescription] = useState('')
  const [importance, setImportance] = useState<'baixa' | 'mitjana' | 'alta'>('mitjana')
  const [category, setCategory] = useState<CategoryOpt | null>(
    (categories as CategoryOpt[])[0] ?? null
  )
  const [loading, setLoading] = useState(false)

  const canSubmit =
    !!event?.id && !!category?.id && !!description.trim() && !loading

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!event?.id) {
      toast({ title: 'Falta ID de l’esdeveniment', variant: 'destructive' })
      return
    }
    if (!category?.id) {
      toast({ title: 'Categoria obligatòria', variant: 'destructive' })
      return
    }
    if (!description.trim()) {
      toast({ title: 'Descripció obligatòria', variant: 'destructive' })
      return
    }

    try {
      setLoading(true)

      const payload = {
        eventId: String(event.id),
        department: user.department || 'desconegut',
        description: description.trim(),
        createdBy: user.name || 'Usuari desconegut',
        category,
        importance,
      }

      // Debug útil en dev
      console.log('[CreateModificationModal] Enviant payload:', payload)

      const res = await fetch('/api/modifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Error al guardar la modificació')
      }

      toast({ title: '✅ Modificació registrada correctament', duration: 2400 })
      onCreated?.(data?.id)
      onClose()
    } catch (err) {
      console.error('[CreateModificationModal] Error al guardar:', err)
      toast({
        title: 'Error al registrar la modificació',
        description:
          err instanceof Error ? err.message : 'Comprova la connexió o els permisos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-purple-900">
            Registrar modificació
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {event.summary || 'Esdeveniment desconegut'}
          </p>
        </DialogHeader>

        {/* ───────────────────── Formulari ───────────────────── */}
        <form className="space-y-4 mt-2" onSubmit={handleSubmit}>
          {/* Departament (read-only) */}
          <div>
            <label className="text-sm font-medium text-gray-700">Departament</label>
            <Input
              value={user.department || ''}
              readOnly
              className="mt-1 bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Categoria de modificació
            </label>
            <Select
              value={category?.id}
              onValueChange={(val) => {
                const cat = (categories as CategoryOpt[]).find((c) => c.id === val) || null
                setCategory(cat)
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona categoria" />
              </SelectTrigger>
              <SelectContent>
                {(categories as CategoryOpt[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importància */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Grau d’importància
            </label>
            <Select
              value={importance}
              onValueChange={(val) => setImportance(val as 'baixa' | 'mitjana' | 'alta')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">🟢 Baixa</SelectItem>
                <SelectItem value="mitjana">🟠 Mitjana</SelectItem>
                <SelectItem value="alta">🔴 Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripció */}
          <div>
            <label className="text-sm font-medium text-gray-700">Descripció</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descriu breument la modificació realitzada..."
              className="w-full mt-1 p-2 border rounded-md text-sm h-24"
            />
          </div>

          {/* ───────────────────── Accions ───────────────────── */}
          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-gray-600"
            >
              Cancel·lar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Guardant...' : 'Guardar modificació'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
