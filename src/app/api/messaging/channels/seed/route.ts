import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

export const runtime = 'nodejs'

const PILOT_LOCATIONS = [
  { source: 'events', location: 'Clos la Plana' },
  { source: 'events', location: 'Josep Massachs' },
  { source: 'events', location: 'Mirador Events' },
  { source: 'events', location: 'Font de la Canya' },
  { source: 'events', location: 'La Masia' },
  { source: 'restaurants', location: 'Mirador' },
  { source: 'restaurants', location: 'Nàutic' },
  { source: 'restaurants', location: 'La Masia' },
  { source: 'restaurants', location: 'Camp Nou' },
  { source: 'restaurants', location: 'Soliver' },
]

const PILOT_TYPES = ['manteniment', 'maquinaria', 'produccio'] as const

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = normalizeRole((session.user as any)?.role || '')
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const batch = db.batch()
    const now = Date.now()

    for (const type of PILOT_TYPES) {
      for (const ch of PILOT_LOCATIONS) {
        const typeLabel =
          type === 'manteniment'
            ? 'Manteniment'
            : type === 'maquinaria'
            ? 'Maquinària'
            : 'Producció'
        const sourceLabel = ch.source === 'events' ? 'Events' : 'Restaurants'
        const name = `${typeLabel} · ${sourceLabel} · ${ch.location}`
        const docId = `${type}_${ch.source}_${slugify(ch.location)}`
        const docRef = db.collection('channels').doc(docId)
        batch.set(
          docRef,
          {
            type,
            source: ch.source,
            location: ch.location,
            name,
            createdBy: (session.user as any)?.id || 'system',
            createdAt: now,
            lastMessagePreview: '',
            lastMessageAt: 0,
            responsibleUserId: null,
            responsibleUserName: null,
          },
          { merge: true }
        )
      }
    }

    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
