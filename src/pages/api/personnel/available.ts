// ✅ file: src/pages/api/personnel/available.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebaseAdmin'

type Personnel = {
  id: string
  name?: string
  role?: string
  department?: string
  isDriver?: boolean
  active?: boolean
}

type Quadrant = {
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  responsable?: string
  conductor?: string
  treballadors?: string[]
  departament?: string
}

// Helpers
function combine(date: string, time?: string) {
  return new Date(`${date}T${time || '00:00'}`)
}
function isOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return !(aEnd <= bStart || bEnd <= aStart)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { departament, startDate, endDate, startTime, endTime } = req.query as {
      departament: string
      startDate: string
      endDate: string
      startTime?: string
      endTime?: string
    }

    // 🔹 Personal del departament
    const personnelSnap = await db
      .collection('personnel')
      .where('department', '==', departament)
      .get()

    const allPersonnel: Personnel[] = personnelSnap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Partial<Personnel>),
    }))

    // 🔹 Quadrants del mateix departament
    const quadrantsSnap = await db
      .collection('quadrants')
      .where('departament', '==', departament)
      .get()

    const allQuadrants: Quadrant[] = quadrantsSnap.docs.map(doc => doc.data() as Quadrant)

    // 🔹 IDs ocupats per solapament
    const unavailable = new Set<string>()
    const reqStart = combine(startDate, startTime)
    const reqEnd = combine(endDate, endTime)

    for (const q of allQuadrants) {
      const qStart = combine(q.startDate, q.startTime)
      const qEnd = combine(q.endDate, q.endTime)
      if (isOverlap(qStart, qEnd, reqStart, reqEnd)) {
        ;[q.responsable, q.conductor, ...(q.treballadors || [])]
          .filter((id): id is string => Boolean(id))
          .forEach(id => unavailable.add(id))
      }
    }

    // 🔹 Personal disponible
    const disponibles = allPersonnel.filter(p => !unavailable.has(p.id) && p.active !== false)

    // 🔹 Classificació per rol
    const responsables = disponibles.filter(
      p => p.role === 'Responsable' || p.role === 'Cap Departament'
    )
    const conductors = disponibles.filter(p => !!p.isDriver)
    const treballadors = disponibles.filter(
      p => p.role === 'Treballador' || p.role === 'Personal'
    )

    return res.status(200).json({ responsables, conductors, treballadors })
  } catch (error) {
    console.error('Error a /api/personnel/available:', error)
    return res.status(500).json({ error: 'Error carregant personal disponible' })
  }
}
