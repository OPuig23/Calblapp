// src/app/api/user-requests/[id]/approve/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin } from '@/lib/firebaseAdmin'

import { normalizeRole } from '@/lib/roles'

const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) =>
  unaccent((s || '').toString().trim()).toLowerCase()

interface UserRequest {
  status?: string
  createdAt?: number
  updatedAt?: number
  requestedByUserId?: string | null
  requestedByName?: string | null
  email?: string | null
  phone?: string | null
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

interface UserDoc {
  role?: string
  notificationsUnread?: number
  name?: string
}

async function usernameExists(username: string, excludeId?: string) {
  const snap = await firestoreAdmin
    .collection('users')
    .where('name', '==', username)
    .get()

  const conflict = snap.docs.find(
    d =>
      d.id !== excludeId &&
      normLower((d.data() as UserDoc).name) === normLower(username)
  )

  return Boolean(conflict)
}

async function notifyRequester(
  requesterId: string | null | undefined,
  title: string,
  body: string,
  personId: string,
  req: NextRequest
) {
  if (!requesterId) return
  try {
    const doc = await firestoreAdmin.collection('users').doc(requesterId).get()
    if (!doc.exists) return

    const data = doc.data() as UserDoc
    await doc.ref.set(
      { notificationsUnread: (data.notificationsUnread || 0) + 1 },
      { merge: true }
    )
    await doc.ref.collection('notifications').add({
      title,
      body,
      createdAt: Date.now(),
      read: false,
      type: 'user_request_result',
      personId,
    })

    try {
      await fetch(`${req.nextUrl.origin}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: requesterId,
          title,
          body,
          url: '/menu/personnel',
        }),
      })
    } catch (pushErr) {
      console.error('Error enviant push al cap:', pushErr)
    }
  } catch (err) {
    console.error('Error notificació requester:', err)
  }
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
    const { password: passwordFromBody } = (await req.json().catch(() => ({}))) as {
      password?: string
    }
    console.log('[approve] Inici aprovació per personId:', personId)

    const reqRef = firestoreAdmin.collection('userRequests').doc(personId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) {
      console.error('[approve] Sol·licitud no trobada:', personId)
      return NextResponse.json(
        { success: false, error: 'Sol·licitud no trobada' },
        { status: 404 }
      )
    }
    const reqData = reqSnap.data() as UserRequest | undefined
    console.log('[approve] Dades de la sol·licitud:', reqData)

    // Si l'usuari ja existeix, només marquem aprovat
    const userRef = firestoreAdmin.collection('users').doc(personId)
    const userDoc = await userRef.get()
    if (userDoc.exists) {
      console.warn('[approve] Usuari ja existia, no es crearà de nou:', personId)
      await reqRef.set({ status: 'approved', updatedAt: Date.now() }, { merge: true })
      return NextResponse.json({ success: true, alreadyExists: true, user: userDoc.data() })
    }

    // Reaprofitem dades de personnel
    const personSnap = await firestoreAdmin.collection('personnel').doc(personId).get()
    if (!personSnap.exists) {
      console.error('[approve] Personal no trobat:', personId)
      return NextResponse.json(
        { success: false, error: 'Personal no trobat' },
        { status: 404 }
      )
    }
    const p = personSnap.data() as Personnel | undefined
    console.log('[approve] Dades de personnel:', p)

    const desiredUsername = (p?.name || reqData?.requestedByName || personId).toString().trim()
    if (await usernameExists(desiredUsername, personId)) {
      return NextResponse.json(
        { success: false, error: "Nom d'usuari ja existeix", code: 'username_taken' },
        { status: 409 }
      )
    }

    const passwordPlain =
      (passwordFromBody || '').toString().trim() || Math.random().toString(36).slice(-8)

    // Payload per crear usuari nou
    const userPayload = {
      name: desiredUsername,
      password: passwordPlain, // temporal fins OAuth
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

    console.log('[approve] Creant usuari a Firestore.users:', userPayload)

    // Crear usuari amb docId = personId
    await userRef.set(userPayload, { merge: true })

    // Actualitzar sol·licitud com aprovada
    await reqRef.set({ status: 'approved', updatedAt: Date.now() }, { merge: true })

    console.log('[approve] Usuari creat i sol·licitud marcada com aprovada:', personId)

    await notifyRequester(
      reqData?.requestedByUserId,
      'Usuari aprovat',
      `S'ha creat l'usuari ${userPayload.name}. Contrasenya temporal: ${passwordPlain}`,
      personId,
      req
    )

    return NextResponse.json({ success: true, user: { id: personId, ...userPayload } })
  } catch (error: unknown) {
    console.error('[approve user request] error:', error)
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
