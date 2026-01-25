// file: src/app/api/quadrantsDraft/confirm/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import { createNotificationsForQuadrant } from '@/services/notifications'

export const runtime = 'nodejs'
const ORIGIN = 'Molí Vinyals, 11, 08776 Sant Pere de Riudebitlles, Barcelona'
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

/* ------------------ Tipus ------------------ */
interface QuadrantDoc {
  status?: string
  responsable?: { id?: string; name?: string }
  responsableName?: string
  responsableId?: string
  responsables?: Array<{ id?: string; name?: string }>
  conductors?: Array<{ id?: string; name?: string }>
  treballadors?: Array<{ id?: string; name?: string }>
  numDrivers?: number
  totalWorkers?: number
  startDate?: string
  meetingPoint?: string
  distanceKm?: number
}

type AssignedUser = {
  id?: string
  name?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  meetingPoint?: string
  vehicleType?: string
  plate?: string
}

type TokenLike = {
  user?: { email?: string }
  email?: string
}

/* ------------------ Utils ------------------ */
const norm = (v?: string) =>
  (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
    return (meters / 1000) * 2 // anada + tornada
  } catch (err) {
    console.warn('[quadrantsDraft/confirm] distance error', err)
    return null
  }
}

async function lookupUidForAssigned(user: AssignedUser): Promise<string | null> {
  const rawId = String(user?.id || '').trim()
  if (!rawId) return null

  const direct = await db.collection('users').doc(rawId).get()
  if (direct.exists) return rawId

  const q = await db.collection('users').where('userId', '==', rawId).limit(1).get()
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

    // 1) Llegir estat actual
    const snap = await ref.get()
    const prev = snap.exists ? (snap.data() as QuadrantDoc) : null
    const already = prev?.status === 'confirmed'

    // 2) Confirmar
    const now = new Date()
    const updatePayload: Record<string, any> = {
      status: 'confirmed',
      confirmedAt: now,
      confirmedBy:
        (token as TokenLike)?.user?.email ||
        (token as TokenLike)?.email ||
        'system',
    }
    if (body.service !== undefined && body.service !== '') {
      updatePayload.service = body.service
    }
    await ref.set(updatePayload, { merge: true })

    // Distància: sempre intentem recalcular amb l'adreça actual
    const evSnap = await db.collection('stage_verd').doc(String(eventId)).get()
    const ev = evSnap.data() as any
    const destination = ev?.Ubicacio || ev?.location || ev?.address || ''
    const km = await calcDistanceKm(destination)
    if (km) {
      await ref.set({ distanceKm: km, distanceCalcAt: new Date() }, { merge: true })
    }

    // 3) Avisos intel·ligents
    const prevSnap = await ref.get()
    const doc = (prevSnap.data() as QuadrantDoc) || {}

    const extract = (q?: QuadrantDoc) => {
      if (!q) return []
      const arr: AssignedUser[] = []
      const pushUser = (src: any, fallbackName?: string) => {
        const name = String(fallbackName || src?.name || '').trim()
        const id = String(src?.id || src?.userId || src?.personId || '').trim()
        if (!name && !id) return
        arr.push({
          id: id || undefined,
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
      const respFallback = q.responsable || {
        id: q.responsableId,
        name: q.responsableName,
      }
      if (respFallback?.name || respFallback?.id) {
        pushUser(respFallback, respFallback.name)
      }
      ;(q.responsables || []).forEach(r => pushUser(r, r?.name))
      ;(q.conductors || []).forEach(c => pushUser(c, c?.name))
      ;(q.treballadors || []).forEach(t => pushUser(t, t?.name))
      return arr
    }

    const oldUsers = extract(snap.exists ? (prev as QuadrantDoc) : undefined)
    const newUsers = extract(doc)
    const isFirstConfirm = !prev?.status || prev?.status !== 'confirmed'
    let changed = newUsers
    if (!isFirstConfirm) {
      changed = newUsers.filter(nu => {
        const old = nu.id
          ? oldUsers.find(ou => ou.id === nu.id)
          : oldUsers.find(ou => ou.name === nu.name)
        if (!old) return true
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
      const rawUids = await Promise.all(changed.map(u => lookupUidForAssigned(u)))
      const uids = Array.from(new Set(rawUids.filter(Boolean) as string[]))
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

        for (const u of changed) {
          const uid = await lookupUidForAssigned(u)
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

    return NextResponse.json({ ok: true, already })
  } catch (e) {
    console.error('[quadrantsDraft/confirm] error', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
