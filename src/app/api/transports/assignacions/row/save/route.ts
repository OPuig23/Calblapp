// file: src/app/api/transports/assignacions/row/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import crypto from 'crypto'

export const runtime = 'nodejs'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function POST(req: NextRequest) {
  try {
    /* 🔐 AUTH */
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    /* 📥 BODY */
    const body = await req.json()
    const { eventCode, department, data } = body || {}

    if (!eventCode || !department || !data?.plate) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    /* 📍 BUSCAR QUADRANT PER CODE */
    const colName = `quadrants${cap(department)}`
    const snap = await db
      .collection(colName)
      .where('code', '==', String(eventCode))
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Quadrant not found' }, { status: 404 })
    }

    const doc = snap.docs[0]
    const ref = doc.ref
    const current = doc.data() as any

    const now = new Date().toISOString()
    const conductors = Array.isArray(current.conductors)
      ? current.conductors
      : []

    /* 🔁 UPSERT PER MATRÍCULA */
    let replaced = false

    const nextConductors = conductors.map((c: any) => {
      if (c?.plate === data.plate) {
        replaced = true
        return {
          ...c,
          name: data.name || c.name,
          vehicleType: data.vehicleType,
          startDate: data.startDate,
          endDate: data.endDate || data.startDate,
          startTime: data.startTime,
          endTime: data.endTime,
          updatedAt: now,
          updatedBy:
            (token as any)?.name || (token as any)?.email || 'system',
        }
      }
      return c
    })

    /* ➕ AFEGIR SI NO EXISTIA */
    if (!replaced) {
      nextConductors.push({
        id: crypto.randomUUID(),
        department,
        name: data.name || '',
        plate: data.plate,
        vehicleType: data.vehicleType,
        startDate: data.startDate,
        endDate: data.endDate || data.startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        createdAt: now,
        createdBy:
          (token as any)?.name || (token as any)?.email || 'system',
      })
    }

    /* 💾 SAVE */
    await ref.update({
      conductors: nextConductors,
      updatedAt: now,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/transports/assignacions/row/save]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
