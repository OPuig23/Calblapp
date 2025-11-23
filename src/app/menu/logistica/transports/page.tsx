//file: src/app/menu/logistica/transports/page.tsx
'use client'

import React, { useMemo, useState } from 'react'
import TransportList from '@/components/transports/TransportList'
import NewTransportModal from '@/components/transports/NewTransportModal'
import { useTransports } from '@/hooks/useTransports'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { Input } from '@/components/ui/input'
import FilterButton from '@/components/ui/filter-button'
import { useFilters as useSlideFilters } from '@/context/FiltersContext'
import TransportFilters, {
  TransportFiltersState,
} from '@/components/transports/TransportFilters'

export default function LogisticsTransportsPage() {
  const { data: transports = [], refetch } = useTransports()
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingTransport, setEditingTransport] = useState<any | null>(null)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<TransportFiltersState>({
    type: 'all',
    availability: 'all',
    driver: 'all',
  })

  const { setOpen, setContent } = useSlideFilters()

  const handleSaved = () => {
    setModalOpen(false)
    setEditingTransport(null)
    refetch()
  }

  const handleCreate = () => {
    setEditingTransport(null)
    setModalOpen(true)
  }

  const handleEdit = (t: any) => {
    setEditingTransport(t)
    setModalOpen(true)
  }

  const handleDelete = async (t: any) => {
    const confirmDelete = window.confirm(`Vols eliminar el vehicle ${t.plate}?`)
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/transports/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error esborrant vehicle')
      await refetch()
    } catch (err) {
      console.error('❌ Error eliminant vehicle:', err)
      alert('No s’ha pogut eliminar el vehicle.')
    }
  }

  const filteredTransports = useMemo(() => {
    return transports.filter((t) => {
      const txt = `${t.plate ?? ''} ${t.type ?? ''}`.toLowerCase()
      const q = search.trim().toLowerCase()

      if (q && !txt.includes(q)) return false
      if (filters.type !== 'all' && t.type !== filters.type) return false

      if (filters.availability !== 'all') {
        const isAvail = !!t.available
        if (filters.availability === 'available' && !isAvail) return false
        if (filters.availability === 'unavailable' && isAvail) return false
      }

      if (filters.driver === 'assigned' && !t.conductorId) return false
      if (filters.driver === 'unassigned' && t.conductorId) return false

      return true
    })
  }, [transports, search, filters])

  return (
    <section className="space-y-6">
      <ModuleHeader
        icon="🚛"
        title="Transports"
        subtitle="Gestió de vehicles i conductors"
      />

      {/* Barra superior */}
      <div className="flex flex-col gap-3 rounded-xl bg-white shadow-sm border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Llistat de vehicles
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Control centralitzat de matrícula, tipus, conductor i disponibilitat.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            placeholder="Cerca per matrícula o tipus…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm md:w-64"
          />

          <FilterButton
            onClick={() => {
              setContent(
                <TransportFilters filters={filters} setFilters={setFilters} />
              )
              setOpen(true)
            }}
          />
        </div>
      </div>

      <TransportList
        transports={filteredTransports}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <NewTransportModal
        isOpen={isModalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleSaved}
        defaultValues={editingTransport ?? undefined}
      />

      <FloatingAddButton onClick={handleCreate} />
    </section>
  )
}
