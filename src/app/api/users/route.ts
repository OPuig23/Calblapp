// src/app/api/users/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestore as db } from '@/lib/firebaseAdmin'

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) => unaccent((s || '').toString().trim()).toLowerCase()
const isTreballador = (role?: string) => normLower(role) === 'treballador'

export async function GET() {
  try {
    const snap = await db.collection('users').get()
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json(users)
  } catch (e: any) {
    console.error('🛑 GET /api/users failed:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const {
      id, // 👈 opcional: si ve d’una sol·licitud porta personId
      name,
      password,
      role,
      department,
      email,
      phone,
      available,
      isDriver,
      workerRank,
    } = await req.json()

    const userPayload: any = {
      name: (name || '').toString().trim(),
      password: (password || '').toString(),
      role: (role || '').toString().trim(),
      department: (department || '').toString().trim(),
      departmentLower: normLower(department),
      email: (email || '')?.toString().trim() || null,
      phone: (phone || '')?.toString().trim() || null,
      available: isTreballador(role) ? (available ?? true) : undefined,
      isDriver: isTreballador(role) ? (isDriver ?? false) : undefined,
      workerRank: isTreballador(role) ? (workerRank || 'soldat') : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // eliminar undefined
    Object.keys(userPayload).forEach(
      k => userPayload[k] === undefined && delete userPayload[k]
    )

    let ref
    let userId

    if (id) {
      // 🔹 Cas sol·licitud → fem servir el personId com a id de l’usuari
      ref = db.collection('users').doc(id)
      await ref.set({ ...userPayload, userId: id }, { merge: true })
      userId = id
    } else {
      // 🔹 Cas normal → crear un nou document
      ref = await db.collection('users').add(userPayload)
      await ref.set({ userId: ref.id }, { merge: true })
      userId = ref.id
    }

    // 🔹 Si és Treballador → crear/actualitzar fitxa a personnel/{id}
    if (isTreballador(role)) {
      const personRef = db.collection('personnel').doc(userId)
      const snap = await personRef.get()
      const person = {
        id: userId,
        name: userPayload.name,
        department: userPayload.department,
        departmentLower: userPayload.departmentLower,
        role: 'treballador',
        available: userPayload.available ?? true,
        isDriver: userPayload.isDriver ?? false,
        workerRank: userPayload.workerRank || 'soldat',
        email: userPayload.email,
        phone: userPayload.phone,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      if (!snap.exists) await personRef.set(person)
      else await personRef.set(person, { merge: true })
    }

    return NextResponse.json({ id: userId, userId, ...userPayload }, { status: 201 })
  } catch (e: any) {
    console.error('🛑 POST /api/users failed:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
