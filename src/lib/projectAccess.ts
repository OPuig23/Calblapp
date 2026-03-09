import { normalizeRole } from '@/lib/roles'

type ProjectAccessUser = {
  role?: string
  department?: string | null
}

const normalizeDepartment = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export function canAccessProjects(user?: ProjectAccessUser | null) {
  if (!user) return false

  const role = normalizeRole(user.role || '')
  const department = normalizeDepartment(user.department)

  return role === 'admin' || (role === 'cap' && department === 'marqueting')
}
