import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

export const runtime = 'nodejs'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const role = normalizeRole(session?.user?.role)
    const dept = ((session?.user as { departmentLower?: string; department?: string })?.departmentLower ||
      (session?.user as { department?: string })?.department ||
      '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()
    const canEdit =
      role === 'admin' ||
      role === 'direccio' ||
      role === 'comercial' ||
      dept === 'produccio' ||
      (role === 'cap' &&
        (dept === 'empresa' || dept === 'casaments' || dept === 'foodlovers'))

    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tens permisos per eliminar espais.' },
        { status: 403 }
      )
    }

    const id = params.id
    if (!id) {
      return NextResponse.json(
        { error: 'Falta ID de la finca.' },
        { status: 400 }
      )
    }

    await db.collection('finques').doc(id).delete()

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('Error eliminant espai:', err)
    return NextResponse.json(
      { error: 'Error intern al eliminar la finca.' },
      { status: 500 }
    )
  }
}
