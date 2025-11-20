//filename: src/app/api/pissarra/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

// “La Bíblia” §3 Rols i Permisos — només Admin o Producció poden editar

export const runtime = 'nodejs'

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req })
    const role = normalizeRole((token as any)?.role)
    const department = (token as any)?.department?.toLowerCase()

    const canEdit = role === 'admin' || department === 'produccio'
    if (!canEdit) {
      return NextResponse.json({ error: 'No autoritzat' }, { status: 403 })
    }

    const { id, payload } = await req.json()
    if (!id || !payload) {
      return NextResponse.json({ error: 'Falten camps' }, { status: 400 })
    }

    // Si es canvia responsableName i hi ha code, cal reflectir-ho a quadrantsServeis
    // però la font principal és stage_verd: primer actualitzem stage_verd
    const ref = db.collection('stage_verd').doc(id)
    await ref.update(payload)

    // opcional: sincronitzar responsable a quadrantsServeis si arriba
    if (Object.prototype.hasOwnProperty.call(payload, 'responsableName')) {
      const doc = await ref.get()
      const data = doc.data() as any
      const code = data?.code
      if (code) {
        const qs = await db.collection('quadrantsServeis').where('code', '==', code).limit(1).get()
        if (!qs.empty) {
          await qs.docs[0].ref.update({ responsableName: payload.responsableName })
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    console.error('[api/pissarra/update] PUT error', e)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
