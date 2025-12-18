// file: src/app/api/quadrantsDraft/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import { createNotificationsForQuadrant } from '@/services/notifications'

export const runtime = 'nodejs'

/* ------------------ Tipus ------------------ */
interface QuadrantDoc {
  status?: string
  responsable?: { name?: string }
  responsableName?: string
  conductors?: Array<{ name?: string }>
  treballadors?: Array<{ name?: string }>
  numDrivers?: number
  totalWorkers?: number
  responsableId?: string
  startDate?: string
  meetingPoint?: string
}

interface QuadrantNotification {
  userId: string
  quadrantId: string
  payload: {
    weekStartISO: string        // sempre string, mai null
    weekLabel: string
    dept?: string               // opcional
    countAssignments?: number   // opcional
  }
}


type TokenLike = {
  user?: { email?: string }
  email?: string
}

/* ------------------ Utils ------------------ */
const norm = (v?: string) =>
  (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

async function lookupUidByName(name: string): Promise<string | null> {
  const folded = norm(name)

  // Primer intent: camp normalitzat nameFold
  let q = await db.collection('users').where('nameFold', '==', folded).limit(1).get()
  if (!q.empty) return q.docs[0].id

  // Fallback literal
  q = await db.collection('users').where('name', '==', name).limit(1).get()
  if (!q.empty) return q.docs[0].id

  return null
}

/* ------------------ Handler ------------------ */
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
      return NextResponse.json(
        { ok: false, error: 'Missing department or eventId' },
        { status: 400 }
      )
    }

    const dept = norm(deptRaw)
    const colName = `quadrants${capitalize(dept)}`
    const ref = db.collection(colName).doc(String(eventId))

    // ── 1) Llegir estat actual
    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as QuadrantDoc) : null
    const already = prev?.status === 'confirmed'

    // ── 2) Confirmar (idempotent)
    const now = new Date()

    // Construïm payload sense camps undefined
    const updatePayload: Record<string, any> = {
      status: 'confirmed',
      confirmedAt: now,
      confirmedBy:
        (token as TokenLike)?.user?.email ||
        (token as TokenLike)?.email ||
        'system',
    }

    // Només afegim "service" si arriba i no és buit
    if (body.service !== undefined && body.service !== '') {
      updatePayload.service = body.service
    }

    await ref.set(updatePayload, { merge: true })

 // ── 3) Avisos intel·ligents
{
  const prevSnap = await ref.get()
  const prev = prevSnap.data() as QuadrantDoc | undefined
  const doc = prev as QuadrantDoc   // doc = estat actual després del set()

  if (!doc) {
    return NextResponse.json({ ok: true })
  }

  // --- Funció per extreure (nom + camps rellevants)
  const extract = (q?: QuadrantDoc) => {
    if (!q) return []
    const arr: Array<any> = []

    const pushUser = (name: string, src: any) => {
      arr.push({
        name,
        startDate: src.startDate,
        startTime: src.startTime,
        endDate: src.endDate,
        endTime: src.endTime,
        meetingPoint: src.meetingPoint,
        vehicleType: src.vehicleType,
        plate: src.plate,
      })
    }

    // responsable
    const rName = q.responsable?.name || q.responsableName
    if (rName) pushUser(rName, q.responsable || q)

    // conductors
    ;(q.conductors || []).forEach(c => {
      if (c?.name) pushUser(c.name, c)
    })

    // treballadors
    ;(q.treballadors || []).forEach(t => {
      if (t?.name) pushUser(t.name, t)
    })

    return arr
  }

  const oldUsers = extract(prevSnap.exists ? prev : undefined)
  const newUsers = extract(doc)

  // ✨ Si és la PRIMERA confirmació → tots reben push
  const isFirstConfirm = !prev?.status || prev?.status !== 'confirmed'

  let changed = newUsers

  if (!isFirstConfirm) {
    // ✨ Reconfirmació → només nous o editats
    changed = newUsers.filter(nu => {
      const old = oldUsers.find(ou => ou.name === nu.name)
      if (!old) return true // nou usuari
      return (
        old.startDate !== nu.startDate ||
        old.startTime !== nu.startTime ||
        old.endDate !== nu.endDate ||
        old.endTime !== nu.endTime ||
        old.meetingPoint !== nu.meetingPoint ||
        old.vehicleType !== nu.vehicleType ||
        old.plate !== nu.plate
      )
    })
  }

  if (changed.length > 0) {
    const uids = (
      await Promise.all(changed.map(u => lookupUidByName(u.name)))
    ).filter(Boolean) as string[]

    if (uids.length > 0) {
      const notifs = uids.map(uid => ({
        userId: uid,
        quadrantId: String(eventId),
        payload: {
          weekStartISO: doc.startDate || '',
          weekLabel: doc.startDate || '',
          dept: dept,
        },
      }))

      await createNotificationsForQuadrant(notifs)
      // 🔔 PUSH només a conductors afectats
for (const u of changed) {
  const uid = await lookupUidByName(u.name)
  if (!uid) continue

  await fetch(`${process.env.NEXTAUTH_URL}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: uid,
      title: 'Transport assignat / modificat',
      body: 'Revisa vehicle, horaris o matrícula assignats.',
      url: `/menu/logistica/assignacions`,
    }),
  })
}
    
      
    }
  }
}


    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrantsDraft/confirm] error', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
