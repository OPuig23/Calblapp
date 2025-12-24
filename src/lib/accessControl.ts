//file: src/lib/accessControl.ts
import { normalizeRole, type Role } from '@/lib/roles'

/** Tipus d’usuari mínim */
export interface AccessUser {
  role?: string
  department?: string
}

export interface SubModuleDef {
  label: string
  path: string
  roles: Role[]
  departments?: string[]
}

export interface ModuleDef {
  label: string
  path: string
  roles: Role[]
  departments?: string[]
  submodules?: SubModuleDef[]
}

/** 🔐 CATÀLEG ÚNIC DE MÒDULS */
export const MODULES: ModuleDef[] = [
  { label: 'Torns', path: '/menu/torns', roles: ['admin','direccio','cap','treballador'] },

  { label: 'Esdeveniments', path: '/menu/events',
    roles: ['admin','direccio','cap','treballador','comercial','usuari'] },

  { label: 'Pissarra', path: '/menu/pissarra',
    roles: ['admin','direccio','cap','comercial','usuari'] },

  { label: 'Personal', path: '/menu/personnel',
    roles: ['admin','direccio','cap'] },

  { label: 'Quadrants', path: '/menu/quadrants',
    roles: ['admin','direccio','cap'] ,
    departments: ['logistica','cuina','serveis'],
  },

  {
    label: 'Incidències',
    path: '/menu/incidents',
    roles: ['admin','direccio','cap','usuari','comercial'],
    departments: ['produccio','logistica','cuina','serveis'],
  },

  {
    label: 'Modificacions',
    path: '/menu/modifications',
    roles: ['admin','direccio','cap','usuari','comercial'],
    departments: ['produccio','logistica','cuina'],
  },

  { label: 'Informes', path: '/menu/reports',
    roles: ['admin','direccio'] },

  { label: 'Usuaris', path: '/menu/users',
    roles: ['admin'] },

  {
    label: 'Logística',
    path: '/menu/logistica',
    roles: ['admin','direccio','cap','treballador'],
    departments: ['logistica'],
    submodules: [
      {
        label: 'Preparació',
        path: '/menu/logistica/preparacio',
        roles: ['admin','direccio','cap','treballador'],
      },
      {
        label: 'Assignacions',
        path: '/menu/logistica/assignacions',
        roles: ['admin','direccio','cap'],
      },
      {
        label: 'Transports',
        path: '/menu/logistica/transports',
        roles: ['admin','direccio','cap'],
      },
    ],
  },

  {
    label: 'Calendar',
    path: '/menu/calendar',
    roles: ['admin','direccio','cap','comercial','usuari'],
    departments: ['produccio','empresa','casaments','foodlovers'],
  },

  { label: 'Espais', path: '/menu/spaces',
    roles: ['admin','direccio','cap','comercial','usuari'] },
]

/** 🧠 VISIBILITAT DE MÒDULS + SUBMÒDULS */
export function getVisibleModules(user: AccessUser): ModuleDef[] {
  const role = normalizeRole(user.role)
  const dept = (user.department || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .trim()


  return MODULES
    .filter(mod => {
      if (!mod.roles.includes(role)) return false

      if (mod.departments) {
        if (role === 'admin' || role === 'direccio') return true
        return mod.departments.includes(dept)
      }

      return true
    })
    .map(mod => {
      if (!mod.submodules) return mod

      const visibleSubmodules = mod.submodules.filter(sub => {
        if (!sub.roles.includes(role)) return false

        if (sub.departments) {
          if (role === 'admin' || role === 'direccio') return true
          return sub.departments.includes(dept)
        }

        return true
      })

      return {
        ...mod,
        submodules: visibleSubmodules,
      }
    })
}

/** ✏️ PERMISOS D’EDICIÓ DE FINCA */
export function canEditFinca(user?: AccessUser): boolean {
  if (!user) return false

  const role = normalizeRole(user.role)
 const dept = (user.department || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .trim()


  return (
    role === 'admin' ||
    role === 'direccio' ||
    role === 'comercial' ||
    dept === 'produccio'
  )
}
