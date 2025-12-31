import { NextResponse } from 'next/server'

// Disabled until we switch to a secure XLSX parser (previous library is vulnerable).
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        'Sincronitzacio SAP desactivada: la lectura de fitxers XLSX esta pendent de migrar a una llibreria segura.',
    },
    { status: 503 }
  )
}
