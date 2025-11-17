// ✅ file: src/pages/api/personnel/available.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebaseAdmin'

/** Tipus del personal */
type Personnel = {
  id: string
  name?: string
  role?: string
  department?: string
  isDriver?: boolean
  active?: boolean
}

/** Tipus de quadrant */
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

/* ──────────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────────── */
function combine(date: string, time?: string) {
  return new Date(`${date}T${time || '00:00'}`)
}

function isOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return !(aEnd <= bStart || bEnd <= aStart)
}

/* ──────────────────────────────────────────────────────────────
   Handler principal
─────────────────────────────────────────────────────────────── */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { departament, startDate, endDate, startTime, endTime } =
      req.query as {
        departament: string
        startDate: string
        endDate: string
        startTime?: string
        endTime?: string
      }

    /* ────────────────────────────────────────────────────────
       1) OBTENIR PERSONAL DEL DEPARTAMENT
       (Només roles útils: Treballador, Cap Departament, Personal)
    ───────────────────────────────────────────────────────── */
    const personnelSnap = await db
      .collection('personnel')
      .where('department', '==', departament)
      .get()

const allPersonnel = personnelSnap.docs.map((doc) => ({
  id: doc.id,
  ...(doc.data() as any),
})) as Personnel[]

    // Rols que permetem seleccionar manualment o com a disponibles
    const allowedRoles = ['treballador', 'personal', 'cap departament']

    const cleanPersonnel = allPersonnel.filter((p) => {
      const role = p.role?.toLowerCase().trim()
      return p.active !== false && allowedRoles.includes(role || '')
    })

    /* ────────────────────────────────────────────────────────
       2) LLEGIR QUADRANTS EXISTENTS DEL DEPARTAMENT
    ───────────────────────────────────────────────────────── */
    const quadrantsSnap = await db
      .collection('quadrants')
      .where('departament', '==', departament)
      .get()

    const allQuadrants: Quadrant[] = quadrantsSnap.docs.map((doc) =>
      doc.data()
    ) as Quadrant[]

    /* ────────────────────────────────────────────────────────
       3) DETECTAR PERSONAL NO DISPONIBLE PER SOLAPAMENT
    ───────────────────────────────────────────────────────── */
    const unavailable = new Set<string>()

    const reqStart = combine(startDate, startTime)
    const reqEnd = combine(endDate, endTime)

    for (const q of allQuadrants) {
      const qStart = combine(q.startDate, q.startTime)
      const qEnd = combine(q.endDate, q.endTime)

      if (isOverlap(qStart, qEnd, reqStart, reqEnd)) {
        ;[q.responsable, q.conductor, ...(q.treballadors || [])]
          .filter((id): id is string => Boolean(id))
          .forEach((id) => unavailable.add(id))
      }
    }

    /* ────────────────────────────────────────────────────────
       4) PERSONAL DISPONIBLE (manual)
    ───────────────────────────────────────────────────────── */
    const disponibles = cleanPersonnel.filter((p) => !unavailable.has(p.id))

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

    const conductors = disponibles.filter((p) => p.isDriver === true)

    const treballadors = disponibles.filter((p) => {
      const role = p.role?.toLowerCase().trim()
      return role === 'treballador' || role === 'personal'
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
