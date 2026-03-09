import { normalizeRole } from '@/lib/roles'

type ProjectAccessUser = {
  role?: string
  department?: string | null
}

export function canAccessProjects(user?: ProjectAccessUser | null) {
  if (!user) return false

  const role = normalizeRole(user.role || '')
  return ['admin', 'direccio', 'cap', 'usuari', 'comercial'].includes(role)
}
