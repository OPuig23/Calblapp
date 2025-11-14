// src/app/api/user-requests/[id]/approve/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/firebaseAdmin'

import { normalizeRole } from '@/lib/roles'

interface UserRequest {
  status?: string
  createdAt?: number
  updatedAt?: number
}

interface Personnel {
  name?: string
  department?: string
  departmentLower?: string
  email?: string
  phone?: string
  available?: boolean
  isDriver?: boolean
  workerRank?: string
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const roleNorm = normalizeRole((session.user?.role as string | undefined) || '')
  if (roleNorm !== 'admin') {
    return NextResponse.json({ success: false, error: 'Només Admin' }, { status: 403 })
  }

  const personId = ctx.params.id

  try {
    console.log('📩 [approve] Inici aprovació per personId:', personId)

    const reqRef = firestoreAdmin.collection('userRequests').doc(personId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) {
      console.error('❌ [approve] Sol·licitud no trobada:', personId)
      return NextResponse.json({ success: false, error: 'Sol·licitud no trobada' }, { status: 404 })
    }
    const reqData = reqSnap.data() as UserRequest | undefined
    console.log('📥 [approve] Dades de la sol·licitud:', reqData)

    // 🔎 Comprovar si l'usuari ja existeix
    const userRef = firestoreAdmin.collection('users').doc(personId)
    const userDoc = await userRef.get()
    if (userDoc.exists) {
      console.warn('⚠️ [approve] Usuari ja existia, no es crearà de nou:', personId)
      await reqRef.set({ status: 'approved', updatedAt: Date.now() }, { merge: true })
      return NextResponse.json({ success: true, alreadyExists: true, user: userDoc.data() })
    }

    // 🔹 Reaprofitem dades de personnel
    const personSnap = await firestoreAdmin.collection('personnel').doc(personId).get()
    if (!personSnap.exists) {
      console.error('❌ [approve] Personal no trobat:', personId)
      return NextResponse.json({ success: false, error: 'Personal no trobat' }, { status: 404 })
    }
    const p = personSnap.data() as Personnel | undefined
    console.log('📥 [approve] Dades de personnel:', p)

    // 🔹 Payload per crear usuari nou
    const userPayload = {
      name: (p?.name || '').toString().trim(),
      password: Math.random().toString(36).slice(-6), // temporal fins OAuth
      role: 'Treballador',
      department: (p?.department || '').toString().trim(),
      departmentLower: (p?.departmentLower || '').toString().trim().toLowerCase(),
      email: p?.email ?? null,
      phone: p?.phone ?? null,
      userId: personId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      available: p?.available ?? true,
      isDriver: p?.isDriver ?? false,
      workerRank: p?.workerRank ?? 'soldat',
    }

    console.log('📝 [approve] Creant usuari a Firestore.users:', userPayload)

    // 🔹 Crear usuari amb docId = personId
    await userRef.set(userPayload, { merge: true })

    // 🔹 Actualitzar sol·licitud com aprovada
    await reqRef.set({ status: 'approved', updatedAt: Date.now() }, { merge: true })

    console.log('✅ [approve] Usuari creat i sol·licitud marcada com aprovada:', personId)

    return NextResponse.json({ success: true, user: { id: personId, ...userPayload } })
  } catch (error: unknown) {
    console.error('[approve user request] error:', error)
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
