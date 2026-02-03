// file: src/app/api/quadrants/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import { Timestamp } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

interface QuadrantDoc {
  status?: string
  treballadors?: Array<{ name: string }>
  conductors?: Array<{ name: string }>
  responsable?: { name: string }
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  [key: string]: unknown
}

interface TokenWithUser {
  email?: string
  user?: { email?: string }
}

const norm = (v?: string) =>
  (v || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function POST(req: NextRequest) {
  try {
    // -------------------------------------------------------
    // 1) Validació sessió
    // -------------------------------------------------------
    const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as TokenWithUser | null
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // -------------------------------------------------------
    // 2) Validació paràmetres
    // -------------------------------------------------------
    const body = await req.json()
    const deptRaw = body?.department || body?.dept || ''
    const eventId = body?.eventId || body?.id || ''

    if (!deptRaw || !eventId) {
      return NextResponse.json(
        { ok: false, error: 'Missing department or eventId' },
        { status: 400 }
      )
    }

    const dept = norm(deptRaw)
    const colName = `quadrants${capitalize(dept)}`
    const ref = db.collection(colName).doc(String(eventId))

    // -------------------------------------------------------
    // 3) Obtenir informació extres (event code + quadrant data)
    // -------------------------------------------------------
    const stageSnap = await db.collection('stage_verd').doc(String(eventId)).get()
    const stageData = stageSnap.exists ? stageSnap.data() : null

    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as QuadrantDoc) : null
    const already = prev?.status === 'confirmed'

    // -------------------------------------------------------
    // 4) Confirmar quadrant
    // -------------------------------------------------------
    await ref.set(
      {
        status: 'confirmed',
        confirmedAt: Timestamp.fromDate(new Date()),
        confirmedBy: token.user?.email || token.email || 'system',
        code: stageData?.code || stageData?.C_digo || '',
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrants/confirm] error', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
