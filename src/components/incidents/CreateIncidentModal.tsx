//file: src/components/incidents/CreateIncidentModal.tsx
'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import categories from '../../data/incident-categories.json'

interface CreateIncidentModalProps {
  open: boolean
  event: {
    id: string
    summary: string
    start: string
    location?: string
  }
  onClose: () => void
  onCreated: () => void
}

const DEPARTAMENTS = ['Logística', 'Sala', 'Cuina', 'Comercial']
const IMPORTANCIES = ['Alta', 'Mitjana', 'Baixa']

export default function CreateIncidentModal({
  open,
  event,
  onClose,
  onCreated,
}: CreateIncidentModalProps) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? session?.user?.email ?? 'Desconegut'
  const userDepartmentRaw = session?.user?.department ?? ''
  const normalizedUserDepartment = userDepartmentRaw.trim() || DEPARTAMENTS[0]
  const normalizedUserRole = (session?.user?.role ?? '').toLowerCase().trim()
  const canPickDepartment = ['admin', 'direccio'].includes(normalizedUserRole)

  const [department, setDepartment] = useState(normalizedUserDepartment)
  React.useEffect(() => {
    setDepartment(normalizedUserDepartment)
  }, [normalizedUserDepartment])
  const departmentOptions = React.useMemo(() => {
    const list = [...DEPARTAMENTS]
    if (!list.includes(normalizedUserDepartment)) {
      list.unshift(normalizedUserDepartment)
    }
    return list
  }, [normalizedUserDepartment])
  const [importance, setImportance] = useState(IMPORTANCIES[1])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          department,
          importance,
          description,
          respSala: userName,
          category,
        }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || 'Error creant la incidència')
      }

      onCreated()
      onClose()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'No s’ha pogut crear la incidència'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nova incidència</DialogTitle>
          <DialogDescription>
            {event.summary.replace(/#.*$/, '').trim()} ·{' '}
            {event.start.substring(0, 10)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Departament */}
          <div>
            <label className="font-medium block mb-1">Departament *</label>
            <select
              className="w-full p-2 rounded border"
              value={department}
              onChange={(e) => {
                if (canPickDepartment) setDepartment(e.target.value)
              }}
              disabled={!canPickDepartment}
              required
            >
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="font-medium block mb-1">Categoria *</label>
            <select
              className="w-full p-2 rounded border"
              value={category.id}
              onChange={(e) => {
                const selected = categories.find(
                  (c) => c.id === e.target.value
                )
                if (selected) setCategory(selected)
              }}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Importància */}
          <div>
            <label className="font-medium block mb-1">Importància *</label>
            <select
              className="w-full p-2 rounded border"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              required
            >
              {IMPORTANCIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          {/* Descripció */}
          <div>
            <label className="font-medium block mb-1">Descripció *</label>
            <textarea
              className="w-full p-2 rounded border"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Creant...' : 'Crear incidència'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
