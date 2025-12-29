// src/app/api/transports/assignacions/row/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getToken } from 'next-auth/jwt'
import crypto from 'crypto'

export const runtime = 'nodejs'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { eventCode, department, rowId, rowIndex, data, originalPlate } = body || {}

    if (!eventCode || !department || !data?.plate) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

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
    const user = (token as any)?.name || (token as any)?.email || 'system'

    const conductors = Array.isArray(current.conductors) ? current.conductors : []

    const idToUse = rowId || data?.id || crypto.randomUUID()

    const normPlate = (s?: string | null) => String(s || '').trim().toUpperCase()
    const targetPlate = normPlate(data?.plate)
    const origPlateNorm = normPlate(originalPlate)

    let replaced = false
    const nextConductors = conductors.map((c: any) => {
      const curPlateNorm = normPlate(c?.plate)
      if (
        c?.id === idToUse ||
        (origPlateNorm && curPlateNorm === origPlateNorm) ||
        (targetPlate && curPlateNorm === targetPlate)
      ) {
        replaced = true
        return {
          ...c,
          id: c?.id || idToUse,
          department,
          name: data.name || c.name || '',
          plate: data.plate,
          vehicleType: data.vehicleType || c.vehicleType || '',
          startDate: data.startDate || c.startDate || current.startDate || '',
          endDate: data.endDate || data.startDate || c.endDate || c.startDate || '',
          startTime: data.startTime || c.startTime || current.startTime || '',
          endTime: data.endTime || c.endTime || current.endTime || '',
          updatedAt: now,
          updatedBy: user,
        }
      }
      return c
    })

    if (!replaced) {
      const newRow = {
        id: idToUse,
        department,
        name: data.name || '',
        plate: data.plate,
        vehicleType: data.vehicleType || '',
        startDate: data.startDate || current.startDate || '',
        endDate: data.endDate || data.startDate || current.startDate || '',
        startTime: data.startTime || current.startTime || '',
        endTime: data.endTime || current.endTime || '',
        createdAt: now,
        createdBy: user,
      }

      if (typeof rowIndex === 'number' && rowIndex >= 0 && rowIndex < nextConductors.length) {
        nextConductors[rowIndex] = newRow
      } else {
        nextConductors.push(newRow)
      }
    }

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
