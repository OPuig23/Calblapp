// file: src/app/api/quadrants/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import { Timestamp } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

const norm = (v?: string) =>
  (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const deptRaw: string = body?.department || body?.dept
    const eventId: string = body?.eventId || body?.id
    if (!deptRaw || !eventId) {
      return NextResponse.json({ ok: false, error: 'Missing department or eventId' }, { status: 400 })
    }

    const dept = norm(deptRaw)
    const colName = `quadrants${capitalize(dept)}`
    const ref = db.collection(colName).doc(String(eventId))

    // Llegim estat anterior
    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as any) : null
    const already = prev?.status === 'confirmed'

    // Guardem confirmació
    await ref.set(
      {
        status: 'confirmed',
        confirmedAt: Timestamp.fromDate(new Date()), // 👈 Timestamp
        confirmedBy:
          (token as any)?.user?.email ||
          (token as any)?.email ||
          'system',
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrants/confirm] error', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
