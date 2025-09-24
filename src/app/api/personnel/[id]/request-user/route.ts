//filename: src/app/api/personnel/[id]/request-user/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestore } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) =>
  unaccent((s || '').toString().trim()).toLowerCase()

async function notifyAdmins(title: string, body: string, personId: string) {
  const snap = await firestore.collection('users').get()
  const admins = snap.docs.filter(
    d => normalizeRole(String(d.data()?.role || '')) === 'admin'
  )
  const now = Date.now()
  for (const d of admins) {
    try {
      await d.ref.set(
        { notificationsUnread: (d.data()?.notificationsUnread || 0) + 1 },
        { merge: true }
      )
      await d.ref.collection('notifications').add({
        title,
        body,
        createdAt: now,
        read: false,
        type: 'user_request',
        personId, // 👈 guardem el personId per després poder obrir el modal
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

  const requesterId =
    (session.user as any)?.id || (session.user as any)?.userId || ''
  const requesterName = (session.user as any)?.name || '—'
  const requesterRole = normalizeRole((session.user as any)?.role)
  const requesterDeptLower =
    (session.user as any)?.deptLower ||
    normLower((session.user as any)?.department)

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
    const personSnap = await firestore
      .collection('personnel')
      .doc(personId)
      .get()
    if (!personSnap.exists) {
      console.error('❌ No existeix el personal:', personId)
      return NextResponse.json(
        { success: false, error: 'No existeix el personal' },
        { status: 404 }
      )
    }
    const p = personSnap.data() as any
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
    const userDoc = await firestore.collection('users').doc(personId).get()
    if (userDoc.exists) {
      console.warn('⚠️ Aquest treballador ja té usuari:', personId)
      return NextResponse.json(
        { success: false, error: 'Aquest treballador ja té usuari' },
        { status: 409 }
      )
    }

    // Si ja hi ha sol·licitud pendent → idempotent
    const reqRef = firestore.collection('userRequests').doc(personId)
    const reqSnap = await reqRef.get()
    if (reqSnap.exists && reqSnap.data()?.status === 'pending') {
      console.log('ℹ️ Ja hi ha una sol·licitud pendent per:', personId)
      return NextResponse.json({
        success: true,
        alreadyPending: true,
        status: 'pending',
      })
    }

    // Crear/actualitzar sol·licitud amb tots els camps
    const now = Date.now()
    const payload = {
      personId,
      departmentLower: personDeptLower,
      requestedByUserId: requesterId || null,
      requestedByName: requesterName || null,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      // Camps extra per preomplir el formulari
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

    console.log('✅ Sol·licitud guardada correctament per:', personId)
    return NextResponse.json({ success: true, status: 'pending' })
  } catch (e: any) {
    console.error('[request-user] error:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Error intern' },
      { status: 500 }
    )
  }
}
