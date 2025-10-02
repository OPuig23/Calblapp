// filename: src/app/api/transports/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestore } from '@/lib/firebaseAdmin'

const COLLECTION = 'transports'

// PUT → Actualitzar un transport
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> } // 👈 params ara és una Promise
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await context.params // 👈 fem await abans d’usar id
    const body = await req.json()
    await firestore.collection(COLLECTION).doc(id).update(body)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error actualitzant transport:', error)
    return NextResponse.json({ error: 'Error actualitzant' }, { status: 500 })
  }
}

// DELETE → Eliminar un transport
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await context.params // 👈 també aquí
    await firestore.collection(COLLECTION).doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error eliminant transport:', error)
    return NextResponse.json({ error: 'Error eliminant' }, { status: 500 })
  }
}
