// ✅ filename: src/app/api/quadrants/linked/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET(req: Request) {
  try {
    console.log('🟢 [linked] Iniciant consulta a Firestore...')
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (start && end) {
      console.log(`📆 [linked] Paràmetres rebuts: ${start} → ${end}`)
    }

    const collections = ['quadrantsServeis', 'quadrantsCuina', 'quadrantsLogistica']
    const linked: Record<string, any[]> = {}

    await Promise.all(
      collections.map(async (col) => {
        console.log(`📂 [linked] Llegint col·lecció: ${col}`)
        const snapshot = await db.collection(col).get()
        console.log(`📊 [linked] Docs trobats a ${col}:`, snapshot.size)

        snapshot.forEach((doc) => {
          const d = doc.data() as any
          const code = (d.code || '').toUpperCase()
          if (!code) return

          if (!linked[code]) linked[code] = []
          linked[code].push({
            dept: d.department?.toLowerCase() || col.replace('quadrants', '').toLowerCase(),
            startTime: d.startTime || '',
            responsable: d.responsable?.name || '',
          })
        })
      })
    )

    const codes = Object.keys(linked)
    console.log('✅ [linked] Codis totals trobats:', codes.length)
    if (codes.length) console.log('📦 Exemple primer codi:', codes[0], linked[codes[0]])

    return NextResponse.json({ ok: true, linked })
  } catch (err: any) {
    console.error('❌ [linked] Error intern:', err)
    return NextResponse.json({ error: err.message || 'Error intern del servidor' }, { status: 500 })
  }
}
