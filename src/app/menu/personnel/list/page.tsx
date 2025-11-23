// file: src/app/menu/personnel/list/page.tsx
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PersonnelList from '@/components/personnel/PersonnelList'
import NewPersonnelModal from '@/components/personnel/NewPersonnelModal'
import EditPersonnelModal from '@/components/personnel/EditPersonnelModal'
import FloatingAddButton from '@/components/ui/floating-add-button'
import FilterButton from '@/components/ui/filter-button'
import PersonnelFilters from '@/components/personnel/PersonnelFilters'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'
import { useFilters } from '@/context/FiltersContext'

type SessionUser = {
  department?: string
}

export default function PersonnelListPage() {
  const { data: session } = useSession()
  const { data: allPersonnel = [], isLoading, isError, refetch } = usePersonnel()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null)

  // 🔍 Cerca
  const [searchTerm, setSearchTerm] = useState('')

  // 🎛 Estat dels filtres del slide-over
  const [filters, setFilters] = useState({
    roleType: '',
    isDriver: 'all' as 'all' | 'yes' | 'no',
    department: ''
  })

  // SlideOver global: injectar els filtres de Personal
 const { setContent, setOpen } = useFilters()


  useEffect(() => {
    setContent(
      <PersonnelFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />
    )
  }, [filters, setContent])

  // 🧮 FILTRAT FINAL
  const filteredPersonnel = useMemo(() => {
    const term = searchTerm.toLowerCase()

    return allPersonnel.filter((p) => {

      // 🔍 Filtre per nom
      if (!p.name?.toLowerCase().includes(term)) return false

      // 🔹 Filtre per rol
      if (filters.roleType && p.role?.toLowerCase() !== filters.roleType)
        return false

      // 🔹 Filtre per conductor
   const isDriver = p.driver?.isDriver ?? false

if (filters.isDriver !== 'all') {
  if (filters.isDriver === 'yes' && !isDriver) return false
  if (filters.isDriver === 'no'  &&  isDriver) return false
}


      // 🔹 Filtre per departament
      if (filters.department && p.department?.toLowerCase() !== filters.department)
        return false

      return true
    })
  }, [allPersonnel, searchTerm, filters])

  if (isLoading) return <p>Carregant personal…</p>
  if (isError) return <p className="text-red-600">Error carregant personal.</p>

  return (
    <section className="p-0 space-y-4">

      {/* 🔍 Barra de cerca */}
<div className="px-1 pt-2 flex items-center gap-2 relative z-40">



  
  {/* 🔍 Input de cerca */}
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Cerca per nom..."
    className="flex-1 h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
  />

  {/* 🎛 Botó de filtres (mateix estil que Events/Torns) */}
  <FilterButton onClick={() => setOpen(true)} />

</div>


      {/* 📋 Llista de personal */}
      <div className="p-6">
        <PersonnelList
          personnel={filteredPersonnel}
          mutate={refetch}
          onEdit={setEditingPerson}
        />
      </div>

      {/* ➕ Crear nou */}
      <NewPersonnelModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => {
          refetch()
          setModalOpen(false)
        }}
        defaultDepartment={(session?.user as SessionUser)?.department}
      />

      {/* ✏️ Editar */}
      {editingPerson && (
        <EditPersonnelModal
          isOpen={true}
          onOpenChange={() => setEditingPerson(null)}
          onSaved={() => {
            refetch()
            setEditingPerson(null)
          }}
          person={editingPerson}
        />
      )}

      {/* ➕ Botó flotant “Afegir nou” */}
      <FloatingAddButton onClick={() => setModalOpen(true)} />

    </section>
  )
}
