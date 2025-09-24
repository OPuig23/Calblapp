//file: src/app/menu/personnel/list/page.tsx
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import NewPersonnelModal from '@/components/personnel/NewPersonnelModal'
import EditPersonnelModal from '@/components/personnel/EditPersonnelModal'
import PersonnelList from '@/components/personnel/PersonnelList'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'
import { Plus } from 'lucide-react'
import { normalizeRole } from '@/lib/roles'
import { PersonnelFilters, PersonnelFiltersValues } from '@/components/personnel/PersonnelFilters'

export default function PersonnelListPage() {
  const { data: session, status } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null)

  const roleNorm = normalizeRole((session?.user as any)?.role)

  const {
    data: allPersonnel = [],
    isLoading,
    isError,
    refetch,
  } = usePersonnel()

  // 🔹 Estat dels filtres
  const [filters, setFilters] = useState<PersonnelFiltersValues>({})

  // 🔹 Handler de filtres estable
  const handleFilters = useCallback((f: PersonnelFiltersValues) => {
    setFilters(f)
  }, [])

  // 🔹 Llista filtrada
  const filteredPersonnel = useMemo(() => {
    return allPersonnel.filter((p) => {
      if (filters.department && p.department?.toLowerCase() !== filters.department.toLowerCase()) {
        return false
      }
      if (filters.role && p.role?.toUpperCase() !== filters.role) {
        return false
      }
      if (filters.isDriver !== undefined) {
        if (filters.isDriver && !p.driver?.isDriver) return false
        if (!filters.isDriver && p.driver?.isDriver) return false
      }
      if (filters.isDriver && filters.driverType && filters.driverType !== 'all') {
        if (!p.driver || !p.driver[filters.driverType]) return false
      }
      if (filters.search) {
        const term = filters.search.toLowerCase()
        if (!p.name?.toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [allPersonnel, filters])

  if (status === 'loading') return <p>Carregant sessió…</p>
  if (status !== 'authenticated') return <p className="text-red-600">Accés no autoritzat.</p>
  if (isLoading) return <p>Carregant personal…</p>
  if (isError) return <p className="text-red-600">Error carregant personal.</p>

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
    <section className="p-6 space-y-6">
      {/* 🔹 Capçalera compacta amb filtres i acció */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl bg-white shadow-sm border p-4 gap-4">
        {/* Filtres */}
        <PersonnelFilters
          departments={['Cuina', 'Serveis', 'Logística', 'Transports']}
          onFilter={handleFilters}
        />

        {/* Botó Nou treballador */}
        <Button
          onClick={() => setModalOpen(true)}
          size="lg"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-5 py-3 transition"
        >
          <Plus className="h-5 w-5" />
          <span>Nou treballador</span>
        </Button>
      </div>

      {/* 🔹 Llista de personal filtrada */}
      <PersonnelList personnel={filteredPersonnel} mutate={refetch} onEdit={handleEdit} />

      {/* 🔹 Modals */}
      <NewPersonnelModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleCreated}
        defaultDepartment={(session?.user as any)?.department}
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
