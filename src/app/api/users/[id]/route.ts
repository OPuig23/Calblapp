// src/app/api/users/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestore as db } from '@/lib/firebaseAdmin'

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) => unaccent((s || '').toString().trim()).toLowerCase()
const isTreballador = (role?: string) => normLower(role) === 'treballador'

function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  Object.keys(obj).forEach(k => { if (obj[k] === undefined) delete obj[k] })
  return obj
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const snap = await db.collection('users').doc(params.id).get()
    if (!snap.exists) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json({ id: snap.id, ...snap.data() })
  } catch (e: any) {
    console.error(`🛑 GET /api/users/${params.id} failed:`, e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await req.json()

    const update: any = {
      ...data,
      userId: undefined, // no permetre canviar
      updatedAt: Date.now(),
    }

    if (typeof update.department === 'string') {
      update.department = update.department.trim()
      update.departmentLower = normLower(update.department)
    }

    // si el rol NO és Treballador, ignorem extres per no omplir amb undefined
    if (!isTreballador(update.role)) {
      update.available = undefined
      update.isDriver = undefined
      update.workerRank = undefined
    }

    pruneUndefined(update)
    await db.collection('users').doc(id).set(update, { merge: true })
    await db.collection('users').doc(id).set({ userId: id }, { merge: true })

    if (isTreballador(update.role)) {
      const personRef = db.collection('personnel').doc(id)
      const snap = await personRef.get()
      const body = {
        id,
        name: update.name ?? snap.data()?.name ?? '',
        department: update.department ?? snap.data()?.department ?? '',
        departmentLower: update.departmentLower ?? snap.data()?.departmentLower ?? '',
        role: 'treballador',
        available: update.available ?? snap.data()?.available ?? true,
        isDriver: update.isDriver ?? snap.data()?.isDriver ?? false,
        workerRank: update.workerRank ?? snap.data()?.workerRank ?? 'soldat',
        email: update.email ?? snap.data()?.email ?? null,
        phone: update.phone ?? snap.data()?.phone ?? null,
        updatedAt: Date.now(),
        createdAt: snap.exists ? (snap.data()?.createdAt ?? Date.now()) : Date.now(),
      }
      await personRef.set(body, { merge: true })
    }

    const final = await db.collection('users').doc(id).get()
    return NextResponse.json({ id, ...final.data() })
  } catch (e: any) {
    console.error(`🛑 PUT /api/users/${params.id} failed:`, e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.collection('users').doc(params.id).delete()
    // ✅ CORRECTE: retornem resposta sense cos amb NextResponse
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error(`🛑 DELETE /api/users/${params.id} failed:`, e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
