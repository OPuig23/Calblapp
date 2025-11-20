// src/app/api/quadrantsDraft/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

// Normalitza: "logística" -> "logistica" 
const norm = (s?: string | null) =>
  String(s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().trim()

// Si no trobem col·lecció existent, fem un nom canònic
const canonicalCollectionFor = (dept: string) => {
  const key = norm(dept)
  // Ex: "logistica" -> "quadrantsLogistica"
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
  return `quadrants${capitalized}`
}

async function resolveDeptCollection(dept: string): Promise<string> {
  const key = norm(dept)
  const cols = await db.listCollections()

  for (const c of cols) {
    const plain = c.id
      .replace(/^quadrants/i, '')
      .replace(/[_\-\s]/g, '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    if (plain === key) return c.id
  }
  // Fallback canònic (no cal que existeixi prèviament)
  return canonicalCollectionFor(dept)
}

type Role = 'responsable' | 'conductor' | 'treballador'

interface RowInput {
  role: Role
  id: string
  name: string
  meetingPoint?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  vehicleType?: string
  plate?: string
}

type Line = {
  id: string
  name: string
  meetingPoint: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  vehicleType: string
  plate: string
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { department, eventId, rows } = await req.json() as {
      department: string
      eventId: string
      rows: RowInput[]
    }

    if (!department || !eventId || !Array.isArray(rows)) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 })
    }

    const coll = await resolveDeptCollection(department)
    const ref  = db.collection(coll).doc(eventId)

    // Separa per rols
    const responsables = rows.filter(r => r.role === 'responsable')
    const conductors   = rows.filter(r => r.role === 'conductor')
    const treballadors = rows.filter(r => r.role === 'treballador')

    const R = responsables[0]

    const toLine = (p: RowInput): Line => ({
      id: p?.id || '',
      name: p?.name || '',
      meetingPoint: p?.meetingPoint || '',
      startDate: p?.startDate || '',
      startTime: p?.startTime || '',
      endDate:   p?.endDate   || '',
      endTime:   p?.endTime   || '',
      vehicleType: p?.vehicleType || '',
      plate: p?.plate || '',
    })

    const updateData: {
      department: string
      eventId: string
      responsable: Line | null
      responsableId: string
      responsableName: string
      conductors: Line[]
      treballadors: Line[]
      numDrivers: number
      totalWorkers: number
      createdAt: Date
      updatedAt: Date
      status: string
    } = {
      department: norm(department),
      eventId,
      responsable: R ? toLine(R) : null,
      responsableId: R?.id || '',
      responsableName: R?.name || '',
      conductors: conductors.map(toLine),
      treballadors: treballadors.map(toLine),

      numDrivers: conductors.length,
      totalWorkers: treballadors.length,

      // crea metadades si no existeixen
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
    }

    // Upsert idempotent
    await ref.set(updateData, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[quadrantsDraft/save] error:', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
