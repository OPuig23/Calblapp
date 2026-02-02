// ✅ file: src/pages/api/personnel/available.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getBusyPersonnelIdsAnyDepartment, norm } from '@/utils/personnelRest'

/** Tipus del personal */
type Personnel = {
  id: string
  name?: string
  role?: string
  department?: string
  isDriver?: boolean
  driver?: {
    isDriver?: boolean
    camioGran?: boolean
    camioPetit?: boolean
  }
  active?: boolean
}

/* ──────────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────
   Handler principal
─────────────────────────────────────────────────────────────── */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { departament, department, startDate, endDate, startTime, endTime, excludeEventId } =
      req.query as {
        departament: string
        department?: string
        startDate: string
        endDate: string
        startTime?: string
        endTime?: string
        excludeEventId?: string
      }
    const dept = (department || departament || '').toString().trim()

    /* ────────────────────────────────────────────────────────
       1) OBTENIR PERSONAL DEL DEPARTAMENT
       (Només roles útils: Treballador, Cap Departament, Personal)
    ───────────────────────────────────────────────────────── */
    let personnelSnap = await db
      .collection('personnel')
      .where('department', '==', dept)
      .get()

    if (personnelSnap.empty) {
      const deptLower = dept.toLowerCase()
      personnelSnap = await db
        .collection('personnel')
        .where('departmentLower', '==', deptLower)
        .get()
    }

const allPersonnel = personnelSnap.docs.map((doc) => ({
  id: doc.id,
  ...(doc.data() as any),
})) as Personnel[]

    // Rols que permetem seleccionar manualment o com a disponibles
    const normalizeRole = (role?: string | null) => {
      const raw = (role || '').toString().trim().toLowerCase()
      return raw === 'soldat' ? 'equip' : raw
    }

    const allowedRoles = new Set([
      'treballador',
      'treballadora',
      'personal',
      'responsable',
      'cap departament',
      'equip',
      'cuina',
      'cocinera',
      'chef',
      'operari',
      'operaria',
      'auxiliar',
    ])

    const cleanPersonnel = allPersonnel.filter((p) => {
      const role = normalizeRole(p.role)
      return p.active !== false && allowedRoles.has(role)
    })

    /* ────────────────────────────────────────────────────────
       2) LLEGIR QUADRANTS EXISTENTS DEL DEPARTAMENT
    ───────────────────────────────────────────────────────── */
    const busyIds = await getBusyPersonnelIdsAnyDepartment(
      startDate,
      endDate,
      startTime || '',
      endTime || '',
      excludeEventId
    )
    const busySet = new Set(busyIds)
    const isBusy = (p: Personnel) => {
      const id = norm(p.id)
      const name = norm(p.name || '')
      return (id && busySet.has(id)) || (name && busySet.has(name))
    }

    const disponibles = cleanPersonnel.filter((p) => !isBusy(p))
    /* ────────────────────────────────────────────────────────
       5) CLASSIFICACIÓ
       - Responsables → Cap Departament + qualsevol usuari amb rol Responsable
       - Conductors → qualsevol disponible amb isDriver
       - Treballadors → NOMÉS Treballador o Personal
    ───────────────────────────────────────────────────────── */

    const responsables = disponibles.filter((p) => {
      const role = p.role?.toLowerCase().trim()
      return role === 'cap departament' || role === 'responsable'
    })

    const conductors = disponibles.filter((p) => {
      return (
        p.isDriver === true ||
        p.driver?.isDriver === true ||
        p.driver?.camioGran === true ||
        p.driver?.camioPetit === true
      )
    })

    const treballadors = disponibles.filter((p) => {
      const role = p.role?.toLowerCase().trim()
      return (
        role === 'treballador' ||
        role === 'personal' ||
        role === 'responsable' ||
        role === 'cap departament'
      )
    })

    /* ────────────────────────────────────────────────────────
       6) RETORNAR RESULTAT
    ───────────────────────────────────────────────────────── */
    return res.status(200).json({
      responsables,
      conductors,
      treballadors,
    })
  } catch (error) {
    console.error('❌ Error a /api/personnel/available:', error)
    return res.status(500).json({
      error: 'Error carregant personal disponible',
    })
  }
}



