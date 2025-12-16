// file: src/services/avisosPush.ts
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

/* ------------------ Utils ------------------ */
const norm = (v?: string) =>
  (v || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

async function lookupUidByName(name: string): Promise<string | null> {
  const folded = norm(name)

  let q = await db.collection('users').where('nameFold', '==', folded).limit(1).get()
  if (!q.empty) return q.docs[0].id

  q = await db.collection('users').where('name', '==', name).limit(1).get()
  if (!q.empty) return q.docs[0].id

  return null
}

function extractResponsableNames(q: any): string[] {
  const out: string[] = []

  const r1 = q?.responsable?.name
  const r2 = q?.responsableName

  if (typeof r1 === 'string' && r1.trim()) out.push(r1.trim())
  if (typeof r2 === 'string' && r2.trim()) out.push(r2.trim())

  const scanArr = (arr: any[]) => {
    for (const it of arr || []) {
      const role = norm(it?.role)
      const name = it?.name
      if (name && role.includes('responsable')) {
        out.push(String(name).trim())
      }
    }
  }

  scanArr(q?.treballadors || [])
  scanArr(q?.conductors || [])

  return Array.from(new Set(out))
}

/* ======================================================
   TARGETS PUSH AVISOS
   ====================================================== */
export async function getAvisosPushTargets(eventCode: string) {
  const quadrantCollections = [
    'quadrantsCuina',
    'quadrantsLogistica',
    'quadrantsServeis',
  ] as const

  const responsableNames = new Set<string>()
  let eventName: string | null = null

  /* ── 1) RESPONSABLES (quadrants) */
  for (const col of quadrantCollections) {
    const snap = await db
      .collection(col)
      .where('code', '==', eventCode)
      .limit(1)
      .get()

    if (snap.empty) continue

    const data = snap.docs[0].data()

    if (!eventName && typeof data?.eventName === 'string') {
      eventName = data.eventName.trim()
    }

    extractResponsableNames(data).forEach((n) => responsableNames.add(n))
  }

  /* ── 2) UID RESPONSABLES */
  const responsableUids = (
    await Promise.all(
      Array.from(responsableNames).map((name) => lookupUidByName(name))
    )
  ).filter(Boolean) as string[]

  /* ── 3) ADMINS (SEMPRE) */
  const adminsSnap = await db
    .collection('users')
    .where('role', '==', 'admin')
    .get()

  const adminUids = adminsSnap.docs.map((d) => d.id)

  /* ── 4) MERGE FINAL */
  const uids = Array.from(new Set([...responsableUids, ...adminUids]))

  return {
    eventName,
    uids,
  }
}

/* ======================================================
   SEND PUSH
   ====================================================== */
export async function sendAvisosPush(params: {
  eventCode: string
  title: string
  body: string
}) {
  const { eventCode, title, body } = params

  const { uids } = await getAvisosPushTargets(eventCode)
  if (!uids.length) return { ok: true, sent: 0 }

  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    console.warn('[avisosPush] NEXTAUTH_URL no definit')
    return { ok: false, sent: 0 }
  }

  for (const uid of uids) {
    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        title,
        body,
        url: '/menu/events',
      }),
    })
  }

  return { ok: true, sent: uids.length }
}
