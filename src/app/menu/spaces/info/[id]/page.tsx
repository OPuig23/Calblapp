// file: src/app/menu/spaces/info/[id]/page.tsx

export const dynamic = 'force-dynamic'   // ⭐ Evita el warning

import { firestoreAdmin } from '@/lib/firebaseAdmin'
import SpaceDetailClient, { EspaiDetall } from '../SpaceDetailClient'
import ModuleHeader from '@/components/layout/ModuleHeader'

interface Props {
  params: { id: string }
}

export default async function SpaceDetailPage(props: Props) {
  const params = await props.params
  const id = params.id


  const snap = await firestoreAdmin.collection('finques').doc(id).get()

  if (!snap.exists) {
    return (
      <div className="p-6 text-center text-gray-500">
        Aquesta finca no existeix.
      </div>
    )
  }

  const data = snap.data() || {}

  const espai: EspaiDetall = {
    id,
    code: data.code || data.codi || '',
    nom: data.nom || '',
    ubicacio: data.ubicacio || '',
    ln: data.ln || data.LN || '', // ⭐ ja arreglat
    origen: data.origen || '',
    tipus: data.tipus || (data.code?.startsWith('CC') ? 'Propi' : 'Extern'),
    comercial: data.comercial || {},
    produccio: data.produccio || {},
  }

  return (
    <>
      <ModuleHeader title="Espais" subtitle={espai.nom || 'Detall'} />
      <SpaceDetailClient espai={espai} />
    </>
  )
}
