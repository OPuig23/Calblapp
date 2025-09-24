// File: src/app/api/quadrantsDraft/delete/route.ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

// Normalitza noms de departament
const norm = (v?: string) =>
  (v || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const canonicalCollectionFor = (dept: string) => {
  const key = norm(dept)
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1)
  return `quadrants${capitalized}`
}

export async function POST(req: Request) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { department, eventId } = await req.json()

    if (!department || !eventId) {
      return NextResponse.json({ ok: false, error: 'Missing department or eventId' }, { status: 400 })
    }

    const collName = canonicalCollectionFor(department)
    const ref = db.collection(collName).doc(String(eventId))

    const snap = await ref.get()
    if (!snap.exists) {
      // Idempotent → si no existeix, no passa res
      return NextResponse.json({ ok: true, alreadyDeleted: true })
    }

    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[quadrantsDraft/delete] error:', e)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}
