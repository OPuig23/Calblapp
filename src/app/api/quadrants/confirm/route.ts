// file: src/app/api/quadrants/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import { Timestamp } from 'firebase-admin/firestore'

interface QuadrantDoc {
  status?: string
  [key: string]: unknown
}

export const runtime = 'nodejs'

const norm = (v?: string) =>
  (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** 🔑 Definim millor el tipus del token */
interface TokenWithUser {
  email?: string
  user?: {
    email?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  try {
    const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as TokenWithUser | null
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { department?: string; dept?: string; eventId?: string; id?: string }
    const deptRaw: string = body?.department || body?.dept || ''
    const eventId: string = body?.eventId || body?.id || ''
    if (!deptRaw || !eventId) {
      return NextResponse.json({ ok: false, error: 'Missing department or eventId' }, { status: 400 })
    }

    const dept = norm(deptRaw)
    const colName = `quadrants${capitalize(dept)}`
    const ref = db.collection(colName).doc(String(eventId))
    // 🧩 Obtenim el camp `code` del document original (stage_verd)
const stageSnap = await db.collection('stage_verd').doc(String(eventId)).get()
const stageData = stageSnap.exists ? stageSnap.data() : null
const eventCode = stageData?.code || stageData?.C_digo || ''


    // Llegim estat anterior
    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as QuadrantDoc) : null
    const already = prev?.status === 'confirmed'

    // Guardem confirmació
    await ref.set(
      {
        status: 'confirmed',
        confirmedAt: Timestamp.fromDate(new Date()), // 👈 Timestamp
        confirmedBy: token.user?.email || token.email || 'system',
        code: eventCode,
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, already })
  } catch (e: unknown) {
    console.error('[quadrants/confirm] error', e)
    if (e instanceof Error) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
