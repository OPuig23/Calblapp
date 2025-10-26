import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()

  if (q.length < 2) return NextResponse.json({ data: [] })

  try {
    const snap = await firestore.collection('serveis').get()
    const all = snap.docs.map((d) => d.data() as any)

    const filtered = all.filter((s) => {
      const nom = (s.nom || '').toLowerCase()
      const searchable = (s.searchable || '').toLowerCase()
      return nom.includes(q) || searchable.includes(q)
    })

    const data = filtered.slice(0, 10).map((s) => ({
      nom: s.nom,
      codi: s.codi,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('❌ Error cercant serveis:', error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
