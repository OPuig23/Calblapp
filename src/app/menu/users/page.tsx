// file: src/app/menu/users/page.tsx
'use client'

import React from 'react'
import { withAdmin } from '@/hooks/withAdmin'
import { useUsers } from '@/hooks/useUsers'

import { Button } from '@/components/ui/button'
import { UserTable } from '@/components/users/UserTable'
import UserFormModal from '@/components/users/UserFormModal'
import { UserRequestsList } from '@/components/users/UserRequestsList'
import { Plus, UserCog } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import UserFilters, { UserFiltersState } from '@/components/users/UserFilters'
import FloatingAddButton from '@/components/ui/floating-add-button'


// 🔥 Model unificat amb UserFormModal (id opcional)
export interface AppUser {
  id?: string
  name: string
  role: string
  department: string
  phone?: string

  available?: boolean
  isDriver?: boolean
  workerRank?: string
}

function UsersPage() {
  const { users, loading, saveUser, deleteUser, fetchUsers } = useUsers()

  const [modalUser, setModalUser] = React.useState<AppUser | null>(null)
  const [filters, setFilters] = React.useState<UserFiltersState>({})

  const roleOptions = ['Admin', 'Direcció', 'Cap Departament', 'Treballador']

  const deptOptions = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'ca'))

  // Aplicar filtres
  const filteredUsers = users.filter((u) => {
    const okDept =
      !filters.department ||
      filters.department === '__all__' ||
      u.department === filters.department

    const okRole =
      !filters.role ||
      filters.role === '__all__' ||
      u.role === filters.role

    return okDept && okRole
  })

  return (
    <div className="p-6 space-y-6">

      {/* Capçalera */}
      <ModuleHeader
        icon={<UserCog className="w-7 h-7 text-indigo-600" />}
        title="Gestió d’Usuaris"
        subtitle="Crea, edita i administra usuaris del sistema"
      />

      {/* Sol·licituds pendents */}
      <UserRequestsList onAfterAction={fetchUsers} />

      {/* Filtres + CTA */}
      <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border p-4">
        <UserFilters
          filters={filters}
          setFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          departmentOptions={deptOptions}
          roleOptions={roleOptions}
          users={users || []}
        />

   <FloatingAddButton
  onClick={() =>
    setModalUser({
      id: undefined,
      name: '',
      role: 'Treballador',
      department: 'Total',
      phone: '',
      available: true,
      isDriver: false,
    workerRank: 'equip',
    })
  }
/>

      </div>

      {/* Taula */}
      {loading ? (
        <div className="text-center text-gray-500">Carregant usuaris…</div>
      ) : (
        <UserTable
          users={filteredUsers}
          onEdit={(u) => setModalUser(u as AppUser)}
          onDelete={deleteUser}
        />
      )}

      {/* Modal */}
      {modalUser && (
        <UserFormModal
          user={{
            id: modalUser.id,
            name: modalUser.name,
            role: modalUser.role,
            department: modalUser.department,
            phone: modalUser.phone ?? '',
            available: modalUser.available ?? true,
            driver: { isDriver: modalUser.isDriver ?? false },
            workerRank: modalUser.workerRank ?? 'equip',
          }}
          onSubmit={(data) => {
            saveUser(modalUser.id, data)
            setModalUser(null)
          }}
          onClose={() => setModalUser(null)}
        />
      )}
    </div>
  )
}

export default withAdmin(UsersPage)
