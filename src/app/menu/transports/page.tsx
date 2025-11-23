//file: src/app/menu/transports/page.tsx

'use client'

import React, { useState } from 'react'
import TransportList from '@/components/transports/TransportList'
import NewTransportModal from '@/components/transports/NewTransportModal'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { useTransports } from '@/hooks/useTransports'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FloatingAddButton from '@/components/ui/floating-add-button'



export default function TransportsPage() {
  const { data: transports, refetch } = useTransports()
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingTransport, setEditingTransport] = useState<any | null>(null)

  // 🔹 Crear o actualitzar vehicle
  const handleSaved = () => {
    setModalOpen(false)
    setEditingTransport(null)
    refetch()
  }

  // 🔹 Obrir modal per crear
  const handleCreate = () => {
    setEditingTransport(null)
    setModalOpen(true)
  }

  // 🔹 Obrir modal per editar vehicle existent
  const handleEdit = (t: any) => {
    setEditingTransport(t)
    setModalOpen(true)
  }

  // 🔹 Eliminar vehicle amb confirmació
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

  return (
    <section className="space-y-6">
      {/* Capçalera del mòdul */}
      <ModuleHeader
        icon="🚛"
        title="TRANSPORTS"
        subtitle="Gestió de vehicles i conductors"
      />

      {/* Capçalera del llistat */}
      <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border p-4">
        <h2 className="text-xl font-semibold text-gray-800">Llistat de vehicles</h2>
       
      </div>

      {/* Llistat de targetes de vehicle */}
      <TransportList
        transports={transports}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal crear / editar vehicle */}
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
