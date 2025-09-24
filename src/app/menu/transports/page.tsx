'use client'

import React, { useState } from 'react'
import TransportList from '@/components/transports/TransportList'
import NewTransportModal from '@/components/transports/NewTransportModal'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { useTransports } from '@/hooks/useTransports'
import ModuleHeader from '@/components/layout/ModuleHeader'

export default function TransportsPage() {
  const { data: transports, refetch } = useTransports()
  const [isModalOpen, setModalOpen] = useState(false)

  return (
    <section className="space-y-6">
      {/* Capçalera global unificada */}
      <ModuleHeader
        icon="🚛"
        title="TRANSPORTS"
        subtitle="Gestió de vehicles i conductors"
      />

      {/* Capçalera llistat + CTA */}
      <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border p-4">
        <h2 className="text-xl font-semibold text-gray-800">Llistat de vehicles</h2>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition"
        >
          <PlusCircle className="h-5 w-5" />
          Nou vehicle
        </Button>
      </div>

      {/* Llistat de vehicles */}
      <TransportList
        transports={transports}
        onEdit={() => {}}
        onDelete={() => refetch()}
      />

      {/* Modal crear transport */}
      <NewTransportModal
        isOpen={isModalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => refetch()}
      />
    </section>
  )
}
