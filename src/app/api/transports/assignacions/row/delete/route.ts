import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventCode, department, rowId } = await req.json()

    if (!eventCode || !department || !rowId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const colName = `quadrants${cap(department)}`

    // 🔍 BUSCAR QUADRANT PEL CAMP `code`
    const snap = await db
      .collection(colName)
      .where('code', '==', String(eventCode))
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Quadrant not found' }, { status: 404 })
    }

    const ref = snap.docs[0].ref
    const data = snap.docs[0].data() as any

    const conductors = Array.isArray(data.conductors) ? data.conductors : []

    const nextConductors = conductors.filter((c: any) => c.id !== rowId)

    await ref.update({
      conductors: nextConductors,
      updatedAt: new Date().toISOString(),
      updatedBy: (token as any)?.name || (token as any)?.email || 'system',
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[row/delete]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
