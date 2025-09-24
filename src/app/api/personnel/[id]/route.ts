// src/app/api/personnel/[id]/route.ts

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * GET: Consulta una persona pel seu ID
 */
export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  const personnelId = context.params.id
  if (!personnelId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const doc = await firestore.collection('personnel').doc(personnelId).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ id: doc.id, ...(doc.data() as any) })
  } catch (err: any) {
    console.error(`[api/personnel/${personnelId} GET] Error:`, err)
    return NextResponse.json({ error: 'Internal error reading personnel' }, { status: 500 })
  }
}

/**
 * PUT: Modifica una persona pel seu ID
 */
export async function PUT(request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const personnelId = context.params.id
  try {
    const body = await request.json()
    if (typeof body.available !== 'boolean') {
      return NextResponse.json({ error: "Camp 'available' incorrecte" }, { status: 400 })
    }

    await firestore.collection('personnel').doc(personnelId).update({
      available: body.available,
    })

    return NextResponse.json({ id: personnelId, available: body.available })
  } catch (err: any) {
    console.error(`[api/personnel/${personnelId} PUT] Error:`, err)
    return NextResponse.json({ error: 'Internal error updating personnel' }, { status: 500 })
  }
}



/**
 * DELETE: Esborra una persona pel seu ID
 */
export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const personnelId = context.params.id
  try {
    await firestore.collection('personnel').doc(personnelId).delete()
    return NextResponse.json({ success: true }, { status: 200 }) // 👈 200 en lloc de 204
  } catch (err: any) {
    console.error(`[api/personnel/${personnelId} DELETE] Error:`, err)
    return NextResponse.json({ error: 'Internal error deleting personnel' }, { status: 500 })
  }
}
