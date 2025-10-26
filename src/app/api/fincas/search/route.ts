// ✅ file: src/app/api/fincas/search/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * 🔍 Cerca intel·ligent dins la col·lecció "finques"
 * - Tolerant a accents, majúscules i espais.
 * - Cerca tant en nom com en codi.
 * - Retorna màxim 10 coincidències ordenades per rellevància.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const qRaw = searchParams.get('q') || ''
  const q = qRaw.toLowerCase().trim()

  if (q.length < 2) return NextResponse.json({ data: [] })

  try {
    const snap = await firestore.collection('finques').get()
    const all = snap.docs.map((d) => d.data() as any)

    // 🔤 Funció per normalitzar text (elimina accents, minúscules)
    const normalize = (s: string) =>
      (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // elimina accents
        .toLowerCase()
        .trim()

    const nq = normalize(q)

    // 🔍 Filtre flexible
    const filtered = all.filter((f) => {
      const nom = normalize(f.nom)
      const codi = normalize(f.codi)
      const searchable = normalize(f.searchable)
      return (
        nom.includes(nq) ||
        codi.includes(nq) ||
        searchable.includes(nq)
      )
    })

    // 📊 Ordenem per rellevància (exacte > parcial)
    const sorted = filtered.sort((a, b) => {
      const na = normalize(a.nom)
      const nb = normalize(b.nom)
      if (na.startsWith(nq) && !nb.startsWith(nq)) return -1
      if (!na.startsWith(nq) && nb.startsWith(nq)) return 1
      return na.localeCompare(nb)
    })

    // 🔢 Limitem a 10
    const data = sorted.slice(0, 10).map((f) => ({
      nom: f.nom || '',
      codi: f.codi || '',
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('❌ Error cercant finques:', error)
    return NextResponse.json(
      { error: 'Error cercant finques' },
      { status: 500 }
    )
  }
}
