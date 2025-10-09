// file: src/app/menu/personnel/list/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import PersonnelFilters from '@/components/personnel/PersonnelFilters'
import PersonnelList from '@/components/personnel/PersonnelList'
import NewPersonnelModal from '@/components/personnel/NewPersonnelModal'
import EditPersonnelModal from '@/components/personnel/EditPersonnelModal'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'

type SessionUser = {
  role?: string
  department?: string
}

export default function PersonnelListPage() {
  const { data: session, status } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null)

  // 🔹 Dades del personal
  const { data: allPersonnel = [], isLoading, isError, refetch } = usePersonnel()

  // 🔹 Estat del filtre de cerca
  const [searchTerm, setSearchTerm] = useState('')

  // 🔹 Filtrat per nom
  const filteredPersonnel = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return allPersonnel.filter((p) => p.name?.toLowerCase().includes(term))
  }, [allPersonnel, searchTerm])

  // 🔹 Control d’estat de sessió
  if (status === 'loading') return <p>Carregant sessió…</p>
  if (status !== 'authenticated') return <p className="text-red-600">Accés no autoritzat.</p>
  if (isLoading) return <p>Carregant personal…</p>
  if (isError) return <p className="text-red-600">Error carregant personal.</p>

  // 🔹 Handlers de modals
  const handleCreated = () => {
    refetch()
    setModalOpen(false)
  }

  const handleSaved = () => {
    refetch()
    setEditingPerson(null)
  }

  const handleEdit = (person: Personnel) => setEditingPerson(person)

  return (
    <section className="p-0 space-y-6">
      {/* 🔹 Barra superior de filtres (com a Esdeveniments) */}
      <PersonnelFilters
        search={searchTerm}
        onSearchChange={setSearchTerm}
        onNewWorker={() => setModalOpen(true)}
      />

      {/* 🔹 Llista de personal filtrada */}
      <div className="p-6">
        <PersonnelList
          personnel={filteredPersonnel}
          mutate={refetch}
          onEdit={handleEdit}
        />
      </div>

      {/* 🔹 Modals */}
      <NewPersonnelModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleCreated}
        defaultDepartment={(session?.user as SessionUser)?.department}
      />

      {editingPerson && (
        <EditPersonnelModal
          isOpen={true}
          onOpenChange={() => setEditingPerson(null)}
          onSaved={handleSaved}
          person={editingPerson}
        />
      )}
    </section>
  )
}
