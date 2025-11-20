// file: src/app/menu/spaces/info/page.tsx
import ModuleHeader from '@/components/layout/ModuleHeader'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import SpacesInfoClient from './SpacesInfoClient'

// Tipus bàsic d'espai (ajustarem després si cal)
export type Espai = {
  id: string
  code?: string
  nom: string
  ln?: string
  LN?: string
  tipus: 'Propi' | 'Extern'
  comercial?: unknown
  produccio?: unknown
}

export default async function SpacesInfoPage() {
  // 🔹 Llegeix la col·lecció "finques" amb l'ADMIN SDK (server-side)
  const snap = await firestoreAdmin.collection('finques').get()

  const espais: Espai[] = snap.docs.map((doc) => {
    const d = doc.data() as any

    const code: string = d.code || ''
    const ln: string = d.ln || d.LN || ''
    const nom: string = d.nom || doc.id

    // CCxxxxx = finca pròpia
    const tipus: 'Propi' | 'Extern' = code.startsWith('CC') ? 'Propi' : 'Extern'

    return {
      id: doc.id,
      code,
      nom,
      ln,
      tipus,
      comercial: d.comercial,
      produccio: d.produccio,
    }
  })

  return (
    <>
      {/* Capçalera verda general del mòdul */}
      <ModuleHeader />

      {/* Component client amb filtres i UI */}
      <SpacesInfoClient espais={espais} />
    </>
  )
}
