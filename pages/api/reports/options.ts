// File: pages/api/reports/options.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { firestore }  from '@/services/db'
import { normalizeRole, type Role } from '@/lib/roles'

// Helpers per unificar criteris sense canviar el que veu l'usuari
const normDept = (s?: string) => (s || '').toString().trim().toLowerCase()
const normRole = (s?: string) => (s || '').toString().trim().toLowerCase()
// Neteja bàsica de noms (responsables, events, línies)
const tidy = (s?: string) => (s || '').toString().trim().replace(/\s+/g, ' ')

// Per de-duplicar insensible a majúscules però retornant la primera forma "bonica"
function uniqueCaseInsensitive(values: string[]) {
  const map = new Map<string, string>() // key = lower, value = original
  for (const v of values) {
    const t = tidy(v)
    const key = t.toLowerCase()
    if (!map.has(key) && t) map.set(key, t)
  }
  return Array.from(map.values())
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  const userRole: Role = normalizeRole((session as any)?.user?.role)

  // Autoritzat només per admin/direcció (segons "La Bíblia")
  if (!session || !['admin', 'direccio'].includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Exemple: fem servir l'any passat com a mínim
  const now = new Date()
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

  // Llegeix quadrants del darrer any
  const snap = await firestore
    .collection('quadrants')
    .where('weekStart', '>=', lastYear)
    .get()

  // Conjunts temporals
  const deptSet = new Set<string>()     // guardem ja normalitzat .toLowerCase()
  const roleSet = new Set<string>()     // idem
  const eventList: string[] = []        // el codi d'event ja sol venir "net"
  const respList: string[] = []         // responsables (noms propis)
  const lineList: string[] = []         // línies de negoci

  snap.forEach(doc => {
    const d = doc.data() as any

    // Department a minúscules (acord 08/08)
    if (d?.department) deptSet.add(normDept(d.department))

    // Assignments → personal, events, responsables, línies
    for (const asg of (d?.assignments || [])) {
      // Event code
      if (asg?.code) eventList.push(tidy(asg.code))

      // Línia de negoci
      if (asg?.businessLine) lineList.push(tidy(asg.businessLine))

      // Personal assignat
      for (const s of (asg?.assignedStaff || [])) {
        if (s?.role) roleSet.add(normRole(s.role))
        if (s?.name && (s.isResponsible || s.isResponsable)) {
          // acceptem ambdues propietats per compatibilitat
          respList.push(tidy(s.name))
        }
      }
    }
  })

  // De-duplicació i ordenacions
  const departments = Array.from(deptSet).sort((a, b) => a.localeCompare(b))
  const roles       = Array.from(roleSet).sort((a, b) => a.localeCompare(b))

  const events       = uniqueCaseInsensitive(eventList).sort((a, b) => a.localeCompare(b))
  const responsibles = uniqueCaseInsensitive(respList).sort((a, b) => a.localeCompare(b))
  const lines        = uniqueCaseInsensitive(lineList).sort((a, b) => a.localeCompare(b))

  return res.status(200).json({
    departments,
    roles,
    events,
    responsibles,
    lines,
  })
}
