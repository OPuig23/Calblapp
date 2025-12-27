// src/app/api/quadrantsDraft/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
const ORIGIN = 'Molí Vinyals, 11, 08776 Sant Pere de Riudebitlles, Barcelona'
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

// Normalitza: "logística" -> "logistica"
const norm = (s?: string | null) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

// Si no trobem col·lecció existent, fem un nom canònic
const canonicalCollectionFor = (dept: string) => {
  const key = norm(dept)
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
  return `quadrants${capitalized}` // ex: quadrantsLogistica
}

async function resolveDeptCollection(dept: string): Promise<string> {
  const key = norm(dept)
  const cols = await db.listCollections()

  for (const c of cols) {
    const plain = c.id
      .replace(/^quadrants/i, '')
      .replace(/[_\-\s]/g, '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    if (plain === key) return c.id
  }

  // Fallback canònic (no cal que existeixi prèviament)
  return canonicalCollectionFor(dept)
}

// ✅ Ara incloem també 'brigada'
type Role = 'responsable' | 'conductor' | 'treballador' | 'brigada'

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
  arrivalTime?: string
  workers?: number // només per brigades
}

type Line = {
  id: string
  name: string
  meetingPoint: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  arrivalTime: string
  vehicleType: string
  plate: string
}

type BrigadeLine = Line & {
  workers: number
}

const toLine = (p: RowInput): Line => ({
  id: p?.id || '',
  name: p?.name || '',
  meetingPoint: p?.meetingPoint || '',
  startDate: p?.startDate || '',
  startTime: p?.startTime || '',
  endDate: p?.endDate || '',
  endTime: p?.endTime || '',
  arrivalTime: p?.arrivalTime || '',
  vehicleType: p?.vehicleType || '',
  plate: p?.plate || '',
})

const toBrigadeLine = (p: RowInput): BrigadeLine => ({
  ...toLine(p),
  workers: typeof p?.workers === 'number' ? p.workers : 0,
})

async function calcDistanceKm(destination: string): Promise<number | null> {
  if (!GOOGLE_KEY || !destination) return null
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', ORIGIN)
    url.searchParams.set('destinations', destination)
    url.searchParams.set('key', GOOGLE_KEY)
    url.searchParams.set('mode', 'driving')
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const json = await res.json()
    const el = json?.rows?.[0]?.elements?.[0]
    if (el?.status !== 'OK') return null
    const meters = el.distance?.value
    if (!meters) return null
    return (meters / 1000) * 2 // anada+tornada
  } catch (err) {
    console.warn('[quadrantsDraft/save] distance error', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { department, eventId, rows } = (await req.json()) as {
      department: string
      eventId: string
      rows: RowInput[]
    }

    if (!department || !eventId || !Array.isArray(rows)) {
      return NextResponse.json(
        { ok: false, error: 'Bad payload' },
        { status: 400 }
      )
    }

    const coll = await resolveDeptCollection(department)
    const ref = db.collection(coll).doc(eventId)

    // 🧩 Separa per rols
    const responsables = rows.filter((r) => r.role === 'responsable')
    const conductors = rows.filter((r) => r.role === 'conductor')
    const treballadors = rows.filter((r) => r.role === 'treballador')
    const brigades = rows.filter((r) => r.role === 'brigada')

    // 🔹 Responsable principal (per compatibilitat antiga)
    const mainResponsable = responsables[0] ?? null

    const dataBase = {
      department: norm(department),
      eventId,

      // ⭐ Nou model multi-responsable
      responsables: responsables.map(toLine),

      // ⭐ Resta de rols
      conductors: conductors.map(toLine),
      treballadors: treballadors.map(toLine),
      brigades: brigades.map(toBrigadeLine),

      numDrivers: conductors.length,
      totalWorkers: treballadors.length,

      // 🔙 Camps antics de compatibilitat (els segueix llegint quadrants/get)
      responsable: mainResponsable ? toLine(mainResponsable) : null,
      responsableId: mainResponsable?.id || '',
      responsableName: mainResponsable?.name || '',

      status: 'draft' as const,
      updatedAt: new Date(),
    }

    // 📌 Preservem createdAt si ja existia
    const snap = await ref.get()
    let createdAt = new Date()
    if (snap.exists) {
      const old = snap.data() as any
      createdAt = old?.createdAt?.toDate
        ? old.createdAt.toDate()
        : old?.createdAt || createdAt
    }

    const updateData = {
      ...dataBase,
      createdAt,
    }

    // Upsert idempotent
    await ref.set(updateData, { merge: true })

    // Distància: sempre recalculada amb l'adreça actual
    const evSnap = await db.collection('stage_verd').doc(String(eventId)).get()
    const ev = evSnap.data() as any
    const destination = ev?.Ubicacio || ev?.location || ev?.address || ''
    const km = await calcDistanceKm(destination)
    if (km) {
      await ref.set({ distanceKm: km, distanceCalcAt: new Date() }, { merge: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[quadrantsDraft/save] error:', e)
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
