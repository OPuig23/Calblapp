// file: src/app/menu/spaces/info/new/page.tsx
export const dynamic = 'force-dynamic'

import ModuleHeader from '@/components/layout/ModuleHeader'
import SpaceDetailClient, { EspaiDetall } from '../SpaceDetailClient'

export default function SpaceCreatePage() {
  const espai: EspaiDetall = {
    id: undefined,
    code: '',
    nom: '',
    ubicacio: '',
    ln: '',
    origen: 'manual',
    tipus: 'Extern',
    comercial: {},
    produccio: {},
  }

  return (
    <>
      <ModuleHeader title="Espais" subtitle="Crear espai" />
      <SpaceDetailClient espai={espai} />
    </>
  )
}
