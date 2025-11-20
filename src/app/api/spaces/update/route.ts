import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = session?.user?.role?.toLowerCase() || ''

    // NOMÉS Admin, Direcció o Caps poden editar espais
    if (!['admin', 'direccio', 'cap'].includes(role)) {
      return NextResponse.json(
        { error: 'No tens permisos per editar espais.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { id, produccio = {}, comercial = {}, ...rest } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Falta ID de la finca.' },
        { status: 400 }
      )
    }

    const ref = db.collection('finques').doc(id)

    // Helper netejar arrays
    const cleanArray = (arr: any) =>
      Array.isArray(arr)
        ? arr.map(x => String(x).trim()).filter(Boolean)
        : []

    // Formatem producció
    const produccioFormatted: Record<string, any> = {}

    for (const key of Object.keys(produccio)) {
      const value = produccio[key]

      if (Array.isArray(value)) {
        produccioFormatted[key] = cleanArray(value)
      } else if (typeof value === "string") {
        produccioFormatted[key] = value.trim()
      } else {
        produccioFormatted[key] = value
      }
    }

    const payload = {
      ...rest,            // nom, LN, ubicacio, tipus, origen, code...
      comercial: {
        contacte: comercial.contacte || null,
        telefon: comercial.telefon || null,
        email: comercial.email || null,
        notes: comercial.notes || null,
        condicions: comercial.condicions || null,
      },
      produccio: produccioFormatted,
      updatedAt: Date.now(),
    }

    await ref.set(payload, { merge: true })

    return NextResponse.json({ ok: true, id })

  } catch (err) {
    console.error('❌ Error desant espai:', err)
    return NextResponse.json(
      { error: 'Error intern al desar la finca.' },
      { status: 500 }
    )
  }
}
