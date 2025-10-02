// src/app/api/users/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestore as db } from '@/lib/firebaseAdmin'

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) => unaccent((s || '').toString().trim()).toLowerCase()
const isTreballador = (role?: string) => normLower(role) === 'treballador'

interface UserPayload {
  name: string
  password: string
  role: string
  department: string
  departmentLower: string
  email: string | null
  phone: string | null
  available?: boolean
  isDriver?: boolean
  workerRank?: string
  createdAt: number
  updatedAt: number
}

export async function GET() {
  try {
    const snap = await db.collection('users').get()
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json(users)
  } catch (error: unknown) {
    console.error('🛑 GET /api/users failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const {
      id, // opcional: si ve d’una sol·licitud porta personId
      name,
      password,
      role,
      department,
      email,
      phone,
      available,
      isDriver,
      workerRank,
    } = (await req.json()) as {
      id?: string
      name?: string
      password?: string
      role?: string
      department?: string
      email?: string
      phone?: string
      available?: boolean
      isDriver?: boolean
      workerRank?: string
    }

    const userPayload: UserPayload = {
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
    Object.keys(userPayload).forEach((k) => {
      if ((userPayload as Record<string, unknown>)[k] === undefined) {
        delete (userPayload as Record<string, unknown>)[k]
      }
    })

    let ref
    let userId: string

    if (id) {
      // Cas sol·licitud → fem servir el personId com a id de l’usuari
      ref = db.collection('users').doc(id)
      await ref.set({ ...userPayload, userId: id }, { merge: true })
      userId = id
    } else {
      // Cas normal → crear un nou document
      ref = await db.collection('users').add(userPayload)
      await ref.set({ userId: ref.id }, { merge: true })
      userId = ref.id
    }

    // Si és Treballador → crear/actualitzar fitxa a personnel/{id}
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
  } catch (error: unknown) {
    console.error('🛑 POST /api/users failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
