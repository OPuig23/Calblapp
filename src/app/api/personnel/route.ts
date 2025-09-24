// src/app/api/personnel/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestore } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

export interface PersonnelItem {
  id: string
  name: string
  role: string
  driver?: {
  type: 'none' | 'camioGran' | 'camioPetit'
}

  department: string
  departmentLower?: string
  email?: string | null
  phone?: string | null
  available?: boolean
  hasUser: boolean
  requestStatus: 'none' | 'pending' | 'approved' | 'rejected'
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normLower = (s?: string) => unaccent((s || '').toString().trim()).toLowerCase()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const debugMode = ['1','true','yes'].includes((searchParams.get('debug') || '').toLowerCase())
  const deptParam = searchParams.get('department') || ''

  const roleRaw  = (session.user as any)?.role
  const roleNorm = normalizeRole(roleRaw)
  const isPriv   = roleNorm === 'admin' || roleNorm === 'direccio'

  const rawDept   = isPriv ? (deptParam || '') : (session.user as any)?.department || ''
  const deptLower = normLower(rawDept)

  const dbg: any = {
    session: {
      userId: (session.user as any)?.id || (session.user as any)?.userId || null,
      name:   (session.user as any)?.name,
      roleRaw,
      roleNorm,
      userDept: (session.user as any)?.department || null,
      userDeptLower: (session.user as any)?.deptLower || normLower((session.user as any)?.department),
    },
    query: { deptParam, resolvedDept: rawDept, resolvedDeptLower: deptLower, isPrivileged: isPriv },
    steps: [] as any[],
  }

  try {
    // ────────────────────────────────────────────────────────────────────────────
    // 1) RECUPERACIÓ ROBUSTA: unim 3 estratègies i DESDUPLIQUEM
    // ────────────────────────────────────────────────────────────────────────────
    const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    let stepUsed: string[] = []

    if (deptLower) {
      // a) departmentLower
      const s1 = await firestore
        .collection('personnel')
        .where('departmentLower', '==', deptLower)
        .get()
      s1.docs.forEach(d => byId.set(d.id, d))
      stepUsed.push(`lower:${s1.size}`)

      // b) department (exact)
      const rawTrim = rawDept.trim()
      if (rawTrim) {
        const s2 = await firestore
          .collection('personnel')
          .where('department', '==', rawTrim)
          .get()
        s2.docs.forEach(d => byId.set(d.id, d))
        stepUsed.push(`exact:${s2.size}`)
      }

      // c) fallback: all + filter memòria
      // (això rescata docs sense departmentLower o amb variacions)
      const s3all = await firestore.collection('personnel').get()
      const addedFromAll = s3all.docs.filter(d => {
        const data = d.data() as any
        const dep = normLower(data.departmentLower || data.department)
        return dep === deptLower
      })
      addedFromAll.forEach(d => byId.set(d.id, d))
      stepUsed.push(`all+filter:${addedFromAll.length}`)
    } else {
      // Admin/Direcció sense filtre → tot
      const sAll = await firestore.collection('personnel').get()
      sAll.docs.forEach(d => byId.set(d.id, d))
      stepUsed.push(`all(no-dept-filter):${sAll.size}`)
    }

    const baseDocs = Array.from(byId.values())

    dbg.steps.push({
      step: 'merge-queries',
      used: stepUsed,
      personnelCount: baseDocs.length,
      ids: baseDocs.map(d => d.id),
    })

    // ────────────────────────────────────────────────────────────────────────────
    // 2) Enriquir amb hasUser + requestStatus (sense filtrar)
    // ────────────────────────────────────────────────────────────────────────────
    const personIds = baseDocs.map(d => d.id)

    const userDocs = await Promise.all(
      personIds.map(id => firestore.collection('users').doc(id).get())
    )
    const hasUser = new Map<string, boolean>()
    userDocs.forEach(doc => hasUser.set(doc.id, doc.exists))
    dbg.steps.push({
      step: 'users-lookup',
      usersFound: userDocs.filter(d => d.exists).length,
      userIds: userDocs.filter(d => d.exists).map(d => d.id),
    })

    const reqDocs = await Promise.all(
      personIds.map(id => firestore.collection('userRequests').doc(id).get())
    )
    const reqStatus = new Map<string, 'none' | 'pending' | 'approved' | 'rejected'>()
    reqDocs.forEach(doc => {
      if (!doc.exists) reqStatus.set(doc.id, 'none')
      else reqStatus.set(doc.id, (doc.data()?.status as any) || 'pending')
    })
    dbg.steps.push({
      step: 'requests-lookup',
      pending:  reqDocs.filter(d => d.exists && d.data()?.status === 'pending').map(d => d.id),
      approved: reqDocs.filter(d => d.exists && d.data()?.status === 'approved').map(d => d.id),
      rejected: reqDocs.filter(d => d.exists && d.data()?.status === 'rejected').map(d => d.id),
      none:     reqDocs.filter(d => !d.exists).length,
    })

    const list: PersonnelItem[] = baseDocs.map(doc => {
      const data = doc.data() as any
      return {
        id: doc.id,
        name: data.name || doc.id,
        role: String(data.role || 'treballador'),
        driver: data.driver || { isDriver: false, camioGran: false, camioPetit: false },


        department: data.department || '',
        departmentLower: data.departmentLower || normLower(data.department),
        email: data.email ?? null,
        phone: data.phone ?? null,
        available: data.available ?? true,
        hasUser: hasUser.get(doc.id) || false,
        requestStatus: reqStatus.get(doc.id) || 'none',
      }
    })

    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    console.log(
      '[api/personnel] ROLE=', roleNorm,
      'deptLower=', deptLower,
      'steps=', stepUsed.join('|'),
      'totalPersonnel=', list.length,
      'withUser=', list.filter(x => x.hasUser).length
    )

    if (debugMode) {
      return NextResponse.json({ success: true, data: list, debug: dbg })
    }
    return NextResponse.json({ success: true, data: list })
    } catch (err: any) {
    console.error('[api/personnel GET] Error:', err)
    if (debugMode) {
      dbg.error = err?.message || String(err)
      return NextResponse.json({ success: false, error: 'Error intern', debug: dbg }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: 'Error intern llegint personal.' }, { status: 500 })
  }
}  // 👈🏻 aquí tanquem el GET

// 🔹 POST → crear nou personal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      id,
      name,
      role,
      department,
      email,
      phone,
      available,
      driver,
      maxHoursWeek
    } = body

    // Validació mínima
    if (!id || !name || !department) {
      return NextResponse.json(
        { success: false, error: 'Falten camps obligatoris (id, name, department)' },
        { status: 400 }
      )
    }

    // Desa a Firestore
    await firestore.collection('personnel').doc(id).set({
      id,
      name,
      role: role || 'treballador',
      department,
      departmentLower: normLower(department),
      email: email || null,
      phone: phone || null,
      available: available ?? true,
      driver: driver || { isDriver: false, camioGran: false, camioPetit: false },
      maxHoursWeek: maxHoursWeek ?? 40,
      createdAt: Date.now(),
    }, { merge: true })

    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (err: any) {
    console.error('[api/personnel POST] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Error intern creant personal' },
      { status: 500 }
    )
  }
}



