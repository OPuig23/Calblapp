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

    // -------------------------------------------------------
    // 5) Construcció llista de treballadors pel PUSH
    // -------------------------------------------------------
    const names: string[] = []

    if (prev?.treballadors) {
      prev.treballadors.forEach((t) => t?.name && names.push(t.name))
    }

    if (prev?.conductors) {
      prev.conductors.forEach((c) => c?.name && names.push(c.name))
    }

    if (prev?.responsable?.name) {
      names.push(prev.responsable.name)
    }

    const uniqueNames = Array.from(new Set(names))

    // -------------------------------------------------------
    // 6) Buscar IDs reals a la col·lecció personnel
    // -------------------------------------------------------
    const personnelRef = db.collection('personnel')

    const users = await Promise.all(
      uniqueNames.map(async (name) => {
        const q = await personnelRef.where('name', '==', name).limit(1).get()
        if (q.empty) return null
        return { userId: q.docs[0].id, name }
      })
    )

    const validUsers = users.filter(Boolean) as { userId: string; name: string }[]
    console.log('👥 Push destinat a:', validUsers)

    // -------------------------------------------------------
    // 7) Enviar PUSH a cada usuari
    // -------------------------------------------------------
    const eventName = stageData?.eventName || stageData?.Nom || 'Nou esdeveniment'
    const pushTitle = 'Tens un nou torn assignat'
    const pushBody = `${eventName} – ${prev?.startDate} ${prev?.startTime}`

    for (const u of validUsers) {
await fetch(`${req.nextUrl.origin}/api/push/send`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: u.userId,
    title: pushTitle,
    body: pushBody,
    url: `/menu/torns?open=${eventId}`, // enllaç directe
  }),
})

    }

    console.log('📣 PUSH enviat!')

    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrants/confirm] error', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
