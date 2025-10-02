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

// 🔹 Tipus per a l’usuari
export interface AppUser {
  id: string | null
  name: string
  password: string
  role: string
  department: string
}

function UsersPage() {
  const { users, loading, saveUser, deleteUser, fetchUsers } = useUsers()
  const [modalUser, setModalUser] = React.useState<AppUser | null>(null)
  const [filters, setFilters] = React.useState<UserFiltersState>({})

  // 🔽 Opcions derivades dels usuaris carregats
  const deptOptions = Array.from(new Set(users.map(u => u.department).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'ca'))

  const roleOptions = ['Admin', 'Direcció', 'Cap Departament', 'Treballador']

  // 🔽 Aplicació dels filtres
  const filteredUsers = users.filter(u => {
    const okDept = !filters.department || filters.department === '__all__' || u.department === filters.department
    const okRole = !filters.role || filters.role === '__all__' || u.role === filters.role
    return okDept && okRole
  })

  return (
    <div className="p-6 space-y-6">
      {/* 🔹 Capçalera global */}
      <ModuleHeader
        icon={<UserCog className="w-7 h-7 text-indigo-600" />}
        title="Gestió d’Usuaris"
        subtitle="Crea, edita i administra usuaris del sistema"
      />

      {/* 🔔 Sol·licituds d’usuari pendents */}
      <UserRequestsList onAfterAction={fetchUsers} />

      {/* 🔹 Filtres + CTA en una sola franja */}
      <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border p-4">
        <UserFilters
          filters={filters}
          setFilters={(f) => setFilters(prev => ({ ...prev, ...f }))}
          departmentOptions={deptOptions}
          roleOptions={roleOptions}
          users={users || []}
        />

        <Button
          size="lg"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          onClick={() =>
            setModalUser({
              id: null,
              name: '',
              password: '',
              role: '',
              department: '',
            })
          }
        >
          <Plus className="w-5 h-5" />
          Nou Usuari
        </Button>
      </div>

      {/* 🔹 Taula d’usuaris */}
      {loading ? (
        <div className="text-center text-gray-500">Carregant usuaris…</div>
      ) : (
        <UserTable
          users={filteredUsers}
          onEdit={(u) => setModalUser(u as AppUser)}
          onDelete={deleteUser}
        />
      )}

      {/* 🔹 Modal crear/editar */}
      {modalUser && (
        <UserFormModal
          user={modalUser}
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

// 👇 molt important
export default withAdmin(UsersPage)
