// file: src/app/api/quadrantsDraft/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
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
    weekStartISO: string | null
    weekLabel: string
    dept: string
    countAssignments: number
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
  // Primer intent: camp nameFold
  let q = await db.collection('users').where('nameFold', '==', folded).limit(1).get()
  if (!q.empty) return q.docs[0].id
  // Fallback: camp name literal
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
      return NextResponse.json({ ok: false, error: 'Missing department or eventId' }, { status: 400 })
    }

    const dept = norm(deptRaw)
    const colName = `quadrants${capitalize(dept)}`
    const ref = db.collection(colName).doc(String(eventId))

    // ── 1) llegir estat actual
    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as QuadrantDoc) : null
    const already = prev?.status === 'confirmed'

    // ── 2) confirmar (idempotent)
    const now = new Date()
    await ref.set(
      {
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy:
          (token as TokenLike)?.user?.email ||
          (token as TokenLike)?.email ||
          'system',
      },
      { merge: true }
    )

    // ── 3) AVISOS: només si no estava confirmat abans
    if (!already) {
      const doc = (await ref.get()).data() as QuadrantDoc | undefined
      if (doc) {
        const names = new Set<string>()
        if (doc?.responsable?.name || doc?.responsableName) {
          names.add(doc.responsable?.name || doc.responsableName || '')
        }
        ;(Array.isArray(doc?.conductors) ? doc.conductors : []).forEach((c: { name?: string }) => {
          if (c?.name) names.add(c.name)
        })
        ;(Array.isArray(doc?.treballadors) ? doc.treballadors : []).forEach((t: { name?: string }) => {
          if (t?.name) names.add(t.name)
        })

        const uids = (await Promise.all(Array.from(names).map(lookupUidByName)))
          .filter(Boolean) as string[]

        if (uids.length) {
          const weekStartISO = doc?.startDate || null
          const weekLabel = weekStartISO || ''
          const notifs: QuadrantNotification[] = uids.map(uid => ({
            userId: uid,
            quadrantId: String(eventId),
            payload: {
              weekStartISO,
              weekLabel,
              dept,
              countAssignments:
                (doc?.numDrivers || 0) +
                (doc?.totalWorkers || 0) +
                (doc?.responsableId ? 1 : 0),
            },
          }))
          await createNotificationsForQuadrant(notifs)
        } else {
          console.warn('[confirm] No destinatary UIDs resolved for event', eventId, Array.from(names))
        }
      }
    }

    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrantsDraft/confirm] error', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
