// file: src/app/api/quadrants/departments/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const toSuffix = (id: string) =>
  unaccent(id.replace(/^quadrants/i, '')).replace(/[_\-\s]/g, '').toLowerCase()

export async function GET() {
  try {
    const cols = await db.listCollections()
    const set = new Set<string>()
    for (const c of cols) {
      if (/^quadrants/i.test(c.id)) {
        const suf = toSuffix(c.id) // p.ex. 'quadrantsLogistica' -> 'logistica'
        if (suf) set.add(suf)
      }
    }
    return NextResponse.json({ departments: Array.from(set).sort((a,b)=>a.localeCompare(b,'ca')) })
  } catch (e) {
    console.error('[quadrants/departments]', e)
    return NextResponse.json({ departments: [] }, { status: 200 })
  }
}
