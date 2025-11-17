// file: src/app/api/users/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const normLower = (s?: string) =>
  unaccent((s || '').toString().trim()).toLowerCase()

const isTreballador = (role?: string) => normLower(role) === 'treballador'

// ──────────────────────────────────────────────────────────────
// Tipus
// ──────────────────────────────────────────────────────────────
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
  pushEnabled?: boolean
  createdAt: number
  updatedAt: number
}

// ──────────────────────────────────────────────────────────────
// GET: retorna tots els usuaris
// ──────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const snap = await db.collection('users').get()
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json(users)
  } catch (error: unknown) {
    console.error('🛑 GET /api/users failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────
// POST: crea o actualitza usuari
// ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
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
      pushEnabled?: boolean
    }

    const {
      id,
      name = '',
      password = '',
      role = '',
      department = '',
      email = '',
      phone = '',
      available,
      isDriver,
      workerRank,
      pushEnabled,
    } = body

    // 🔹 Construir payload base
    let userPayload: UserPayload = {
      name: name.trim(),
      password: password.toString(),
      role: role.trim(),
      department: department.trim(),
      departmentLower: normLower(department),
      email: email.trim() || null,
      phone: phone.trim() || null,
      available: isTreballador(role) ? (available ?? true) : undefined,
      isDriver: isTreballador(role) ? (isDriver ?? false) : undefined,
      workerRank: isTreballador(role) ? (workerRank || 'soldat') : undefined,
      pushEnabled: pushEnabled ?? false, // per defecte FALSE si no s’envia
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // ✅ Eliminar valors undefined del payload
    userPayload = Object.fromEntries(
      Object.entries(userPayload).filter(([, v]) => v !== undefined)
    ) as UserPayload

    // 🔹 Crear o actualitzar usuari a `users`
    let userId: string

    if (id) {
      const ref = db.collection('users').doc(id)
      await ref.set({ ...userPayload, userId: id }, { merge: true })
      userId = id
    } else {
      const ref = await db.collection('users').add(userPayload)
      await ref.set({ userId: ref.id }, { merge: true })
      userId = ref.id
    }

    // 🔹 Si és treballador → sincronitza col·lecció `personnel`
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
        // mantenim mateix flag també a `personnel`
        pushEnabled: userPayload.pushEnabled ?? false,
        createdAt: snap.exists ? (snap.data() as any).createdAt ?? Date.now() : Date.now(),
        updatedAt: Date.now(),
      }

      if (!snap.exists) await personRef.set(person)
      else await personRef.set(person, { merge: true })
    }

    // 🔹 Retornar resultat
    return NextResponse.json({ id: userId, ...userPayload }, { status: 201 })
  } catch (error: unknown) {
    console.error('🛑 POST /api/users failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
