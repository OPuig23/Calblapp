import { NextResponse } from 'next/server'
import { firestoreAdmin } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const snap = await firestoreAdmin.collection('finques').get()
    const locations = snap.docs
      .map((doc) => {
        const d = doc.data() as any
        const rawCode = d.code || d.codi || ''
        const rawTipus = d.tipus || ''
        const tipus = rawTipus || (rawCode.startsWith('CC') ? 'Propi' : 'Extern')
        return {
          id: doc.id,
          name: d.nom || doc.id,
          tipus,
        }
      })
      .filter((row) => row.tipus === 'Propi')
      .map((row) => row.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }))

    return NextResponse.json({ locations })
  } catch (err) {
    console.error('[spaces/internal] error', err)
    return NextResponse.json({ error: 'Error carregant ubicacions' }, { status: 500 })
  }
}

