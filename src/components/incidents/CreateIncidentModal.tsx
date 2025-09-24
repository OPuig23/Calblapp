// File: src/app/menu/incidents/components/CreateIncidentModal.tsx
'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import categories from '../../data/incident-categories.json'


interface CreateIncidentModalProps {
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
  event,
  onClose,
  onCreated,
}: CreateIncidentModalProps) {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? session?.user?.email ?? 'Desconegut'

  const [department, setDepartment] = useState(DEPARTAMENTS[0])
  const [importance, setImportance] = useState(IMPORTANCIES[1])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0]) // 👈 correcte aquí dins
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
          category, // 👈 envia { id, label }
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || 'Error creant la incidència')
      }
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'No s’ha pogut crear la incidència')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl max-w-sm w-full shadow-2xl space-y-4 relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-xl"
          aria-label="Tancar"
        >
          ✕
        </button>
        <h2 className="font-bold text-lg">Nova incidència</h2>

        <div className="text-gray-600 text-sm">
          <p>
            <span className="font-medium">Esdeveniment:</span>{' '}
            <b>{event.summary.replace(/#.*$/, '').trim()}</b>
          </p>
          <p>
            <span className="font-medium">Data:</span>{' '}
            {event.start.substring(0, 10)}
          </p>
        </div>

        {/* Departament */}
        <div>
          <label className="font-medium block mb-1">Departament *</label>
          <select
            className="w-full p-2 rounded border"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            {DEPARTAMENTS.map((dep) => (
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
              const selected = categories.find((c) => c.id === e.target.value)
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

        {error && <p className="text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          disabled={loading}
        >
          {loading ? 'Creant...' : 'Crear incidència'}
        </Button>
      </form>
    </div>
  )
}
