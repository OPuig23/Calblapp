// src/app/api/personnel/[id]/request-user/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db, firestoreAdmin } from '@/lib/firebaseAdmin'

import { normalizeRole } from '@/lib/roles'

interface SessionUser {
  id?: string
  userId?: string
  name?: string
  role?: string
  deptLower?: string
  department?: string
  [key: string]: unknown
}

interface PersonnelDoc {
  name?: string
  role?: string
  department?: string
  departmentLower?: string
  driver?: {
    isDriver: boolean
    camioGran: boolean
    camioPetit: boolean
  }
  available?: boolean
  [key: string]: unknown
}

interface UserDoc {
  role?: string
  notificationsUnread?: number
}

interface UserRequestDoc {
  personId: string
  departmentLower: string
  requestedByUserId: string | null
  requestedByName: string | null
  createdAt: number
  updatedAt: number
  status: 'pending' | 'approved' | 'rejected'
  name: string
  role: string
  driver: PersonnelDoc['driver']
  available: boolean
}

const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) =>
  unaccent((s || '').toString().trim()).toLowerCase()

async function notifyAdmins(title: string, body: string, personId: string) {
  const snap = await firestoreAdmin.collection('users').get()
  const admins = snap.docs.filter(d => {
    const data = d.data() as unknown as UserDoc
    return normalizeRole(String(data.role || '')) === 'admin'
  })
  const now = Date.now()
  for (const d of admins) {
    try {
      const data = d.data() as unknown as UserDoc
      await d.ref.set(
        { notificationsUnread: (data.notificationsUnread || 0) + 1 },
        { merge: true }
      )
      await d.ref.collection('notifications').add({
        title,
        body,
        createdAt: now,
        read: false,
        type: 'user_request',
        personId,
      })
    } catch (e) {
      console.error('notifyAdmins error:', e)
    }
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await ctx.params
  const personId = id

  const su = session.user as SessionUser
  const requesterId = su.id || su.userId || ''
  const requesterName = su.name || '—'
  const requesterRole = normalizeRole(su.role)
  const requesterDeptLower = su.deptLower || normLower(su.department)

  const isPrivileged =
    requesterRole === 'admin' || requesterRole === 'direccio'
  const isCapDept = [
    'capdepartament',
    'cap_departament',
    'cap',
    'capdept',
    'head',
  ].includes(requesterRole)

  try {
    console.log('📩 Nova sol·licitud → personId:', personId)

    // Carreguem el personal
    const personSnap = await firestoreAdmin.collection('personnel').doc(personId).get()
    if (!personSnap.exists) {
      console.error('❌ No existeix el personal:', personId)
      return NextResponse.json(
        { success: false, error: 'No existeix el personal' },
        { status: 404 }
      )
    }
    const p = personSnap.data() as unknown as PersonnelDoc

    const personDeptLower = normLower(p.departmentLower || p.department)

    // Comprovació permisos
    if (!isPrivileged) {
      if (!isCapDept) {
        return NextResponse.json(
          { success: false, error: 'Permís denegat (rol)' },
          { status: 403 }
        )
      }
      if (personDeptLower !== requesterDeptLower) {
        return NextResponse.json(
          { success: false, error: 'Només pots demanar usuaris del teu departament' },
          { status: 403 }
        )
      }
    }

    // Si ja té usuari → sortim
    const userDoc = await firestoreAdmin.collection('users').doc(personId).get()
    if (userDoc.exists) {
      console.warn('⚠️ Aquest treballador ja té usuari:', personId)
      return NextResponse.json(
        { success: false, error: 'Aquest treballador ja té usuari' },
        { status: 409 }
      )
    }

    // Si ja hi ha sol·licitud pendent → idempotent
    const reqRef = firestoreAdmin.collection('userRequests').doc(personId)
    const reqSnap = await reqRef.get()
    const existing = reqSnap.data() as unknown as UserRequestDoc | undefined
    if (reqSnap.exists && existing?.status === 'pending') {
      console.log('ℹ️ Ja hi ha una sol·licitud pendent per:', personId)
      return NextResponse.json({
        success: true,
        alreadyPending: true,
        status: 'pending',
      })
    }

    // Crear/actualitzar sol·licitud
    const now = Date.now()
    const payload: UserRequestDoc = {
      personId,
      departmentLower: personDeptLower,
      requestedByUserId: requesterId || null,
      requestedByName: requesterName || null,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      name: p.name || '',
      role: p.role || 'soldat',
      driver: p.driver || {
        isDriver: false,
        camioGran: false,
        camioPetit: false,
      },
      available: p.available ?? true,
    }

    console.log('📝 Guardant sol·licitud userRequests:', payload)
    await reqRef.set(payload, { merge: true })

    // Notificació a Admins
    await notifyAdmins(
      'Nova sol·licitud d’usuari',
      `${requesterName} demana crear usuari per a ${p.name || personId} (${p.department || ''}).`,
      personId
    )
    // 🔵 Enviar PUSH als Admins
try {
  const adminsSnap = await firestoreAdmin.collection('users').get()
  const admins = adminsSnap.docs.filter(d => {
    const data = d.data() as any
    return normalizeRole(String(data.role || '')) === 'admin'
  })

  for (const admin of admins) {
    const adminId = admin.id

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: adminId,
        title: 'Nova sol·licitud d’usuari',
        body: `${requesterName} demana usuari per a ${p.name}`,
        url: '/menu/admin/user-requests'
      })
    })
  }

  console.log('📲 Push enviat als admins')
} catch (err) {
  console.error('❌ Error enviant push a admins:', err)
}


    console.log('✅ Sol·licitud guardada correctament per:', personId)
    return NextResponse.json({ success: true, status: 'pending' })
  } catch (e: unknown) {
    console.error('[request-user] error:', e)
    if (e instanceof Error) {
      return NextResponse.json(
        { success: false, error: e.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Error intern' },
      { status: 500 }
    )
  }
}
