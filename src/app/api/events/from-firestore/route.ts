//file: src/app/api/events/from-firestore/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin } from '@/lib/firebaseAdmin'


export const runtime = 'nodejs'

export async function GET() {
  try {
    // 🔹 Col·leccions que contenen esdeveniments
    const collections = ['stage_blau', 'stage_taronja', 'stage_verd'] as const
    const results: any[] = []

    // 🔁 Recorre totes les col·leccions
    for (const name of collections) {
      const snapshot = await firestoreAdmin.collection(name).get()

      snapshot.forEach((doc) => {
  const data = doc.data()

  // 🧩 Normalitza el camp LN per garantir coherència
  const normalizedData = {
    ...data,
    LN:
      data.LN ||
      data.ln ||
      (typeof data.LN === 'string' && data.LN.trim()) ||
      'Altres',
  }

  // 🧠 Determina StageGroup segons col·lecció
  const StageGroup =
    name === 'stage_blau'
      ? 'Prereserva'
      : name === 'stage_taronja'
      ? 'Proposta'
      : 'Confirmat'

  // 🟢 Nou: assegura que tots els docs tinguin camp origen
  const origen = data.origen || 'zoho'

  // 🔹 Afegeix al resultat
  results.push({
    id: doc.id,
    ...normalizedData,
    StageGroup,
    origen, // 👈 ja no donarà error
  })
})

    }

    // 🗓️ Ordena cronològicament per DataInici
    results.sort(
      (a, b) =>
        new Date(a.DataInici || a.Data || 0).getTime() -
        new Date(b.DataInici || b.Data || 0).getTime()
    )

    // 🔍 Mostra mostra de dades al log per debugging
    if (results[0])
      console.log('🧩 Firestore sample:', {
        LN: results[0].LN,
        Servei: results[0].Servei,
        StageGroup: results[0].StageGroup,
      })
console.log('🔥 LN debug → exemples Firestore:')
results.slice(0, 5).forEach((r, i) => {
  console.log(`${i + 1}. id=${r.id}, LN=${r.LN}, StageGroup=${r.StageGroup}`)
})

    // 🔚 Retorna la resposta
    return NextResponse.json({ data: results, total: results.length })
  } catch (error) {
    console.error('❌ Error llegint esdeveniments de Firestore:', error)
    return NextResponse.json(
      { error: 'Error llegint esdeveniments de Firestore' },
      { status: 500 }
    )
  }
}
