// src/lib/accessControl.ts
import { type Role } from '@/lib/roles'

// Definim quins rols tenen accés a cada mòdul
export const NAV_ITEMS: { label: string; path: string; roles: Role[]; department?: string }[] = [
  { label: 'Torns', path: '/menu/torns', roles: ['admin', 'direccio', 'cap', 'treballador'] },
  { label: 'Esdeveniments', path: '/menu/events', roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'] },
  { label: 'Personal', path: '/menu/personnel', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Quadrants', path: '/menu/quadrants', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Incidències', path: '/menu/incidents', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Informes', path: '/menu/reports', roles: ['admin', 'direccio'] },
  { label: 'Usuaris', path: '/menu/users', roles: ['admin'] },
  { label: 'Transports', path: '/menu/transports', roles: ['admin', 'direccio', 'cap'], department: 'Transports' },
  { label: 'Calendar', path: '/menu/calendar', roles: ['admin', 'direccio', 'comercial'] },
  { label: 'Espais', path: '/menu/spaces', roles: ['admin', 'direccio', 'cap'] },
]

// Helpers: labels i estils per rol
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  direccio: 'Direcció',
  cap: 'Cap departament',
  treballador: 'Treballador',
  comercial: 'Comercial',
  usuari: 'Usuari',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-blue-50 text-blue-700 ring-blue-200',
  direccio: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cap: 'bg-amber-50 text-amber-700 ring-amber-200',
  treballador: 'bg-slate-100 text-slate-700 ring-slate-200',
  comercial: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  usuari: 'bg-gray-100 text-gray-700 ring-gray-200',
}
