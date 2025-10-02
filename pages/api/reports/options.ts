// pages/api/reports/options.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { firestore } from '@/services/db'
import { normalizeRole, type Role } from '@/lib/roles'
import type { Session } from 'next-auth'
import type { QuadrantRecord } from '@/services/db'

// Helpers
const normDept = (s?: string) => (s || '').toString().trim().toLowerCase()
const normRole = (s?: string) => (s || '').toString().trim().toLowerCase()
const tidy = (s?: string) => (s || '').toString().trim().replace(/\s+/g, ' ')

function uniqueCaseInsensitive(values: string[]) {
  const map = new Map<string, string>()
  for (const v of values) {
    const t = tidy(v)
    const key = t.toLowerCase()
    if (!map.has(key) && t) map.set(key, t)
  }
  return Array.from(map.values())
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: Session | null = await getSession({ req })
  const userRole: Role = normalizeRole(session?.user?.role ?? null)

  // Solo admin/direcció según "La Bíblia"
  if (!session || !['admin', 'direccio'].includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Año móvil (mínimo el último año)
  const now = new Date()
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

  // Leemos quadrants del último año
  const snap = await firestore
    .collection('quadrants')
    .where('weekStart', '>=', lastYear)
    .get()

  // Acumuladores
  const deptSet = new Set<string>()
  const roleSet = new Set<string>()
  const eventList: string[] = []
  const respList: string[] = []
  const lineList: string[] = []

  snap.forEach(doc => {
    // ⚡️ Cast controlado para evitar any
    const d = doc.data() as unknown as QuadrantRecord

    if (d.department) deptSet.add(normDept(d.department))

    for (const asg of d.assignments ?? []) {
      if (asg.code) eventList.push(tidy(asg.code))
      if (asg.businessLine) lineList.push(tidy(asg.businessLine))

      for (const s of asg.assignedStaff ?? []) {
        if (s.role) roleSet.add(normRole(s.role))
        if (s.name && (s.isResponsible || s.isResponsable)) {
          respList.push(tidy(s.name))
        }
      }
    }
  })

  // De-duplicación y orden
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
