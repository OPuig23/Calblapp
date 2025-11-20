// file: src/app/api/personnel/check-name/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const norm = (v?: string) =>
  (v || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = norm(searchParams.get('name') || '')
  const excludeId = searchParams.get('excludeId') || null

  if (!name) return NextResponse.json({ exists: false })

  const snap = await db.collection('personnel').get()

  const exists = snap.docs.some(doc => {
    if (excludeId && doc.id === excludeId) return false
    const dName = norm(doc.data().name)
    return dName === name
  })

  return NextResponse.json({ exists })
}
