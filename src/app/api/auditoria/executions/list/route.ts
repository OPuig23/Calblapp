export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

type Department = 'comercial' | 'serveis' | 'cuina' | 'logistica' | 'deco'

function normalizeDept(raw?: string): Department | null {
  const value = (raw || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
  if (value === 'comercial') return 'comercial'
  if (value === 'serveis' || value === 'sala') return 'serveis'
  if (value === 'cuina') return 'cuina'
  if (value === 'logistica') return 'logistica'
  if (value === 'deco' || value === 'decoracio' || value === 'decoracions') return 'deco'
  return null
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as { id?: string; role?: string; department?: string } | undefined
    if (!user?.id) return NextResponse.json({ error: 'No autenticat' }, { status: 401 })

    const role = normalizeRole(user.role || '')
    const userDept = normalizeDept(user.department || '')

    const { searchParams } = new URL(req.url)
    const status = String(searchParams.get('status') || '').trim().toLowerCase()
    const q = String(searchParams.get('q') || '')
      .trim()
      .toLowerCase()
    const department = normalizeDept(searchParams.get('department') || '')
    let fromTs = Number(searchParams.get('fromTs') || 0)
    let toTs = Number(searchParams.get('toTs') || 0)
    const limit = Math.max(1, Math.min(2000, Number(searchParams.get('limit') || 200)))
    if (fromTs > 0 && toTs > 0 && fromTs > toTs) {
      const tmp = fromTs
      fromTs = toTs
      toTs = tmp
    }

    let ref: FirebaseFirestore.Query = firestoreAdmin.collection('audit_runs')

    if (role === 'cap') {
      if (!userDept) return NextResponse.json({ executions: [] }, { status: 200 })
      ref = ref.where('department', '==', userDept)
    } else if (!['admin', 'direccio'].includes(role)) {
      return NextResponse.json({ error: 'Sense permisos' }, { status: 403 })
    }

    const baseRef = ref
    if (fromTs > 0) ref = ref.where('completedAt', '>=', fromTs)
    if (toTs > 0) ref = ref.where('completedAt', '<=', toTs)

    const mapRows = (snap: FirebaseFirestore.QuerySnapshot) =>
      snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        eventId: String(data.eventId || ''),
        eventSummary: String(data.eventSummary || ''),
        eventCode: String(data.eventCode || ''),
        eventLocation: String(data.eventLocation || ''),
        eventDay: String(data.eventDay || ''),
        department: String(data.department || ''),
        templateName: String(data.templateName || ''),
        incidentOutcome: String(data.incidentOutcome || ''),
        incidentIds: Array.isArray(data.incidentIds) ? data.incidentIds : [],
        status: String(data.status || ''),
        completedAt: Number(data.completedAt || 0),
        completedByName: String(data.completedByName || ''),
        reviewedAt: Number(data.reviewedAt || 0),
        reviewedByName: String(data.reviewedByName || ''),
        compliancePct: Number(data.compliancePct || 0),
      }
    })

    let rawRows: ReturnType<typeof mapRows> = []
    try {
      const fetchLimit = Math.max(limit, 500)
      const snap = await ref.orderBy('completedAt', 'desc').limit(fetchLimit).get()
      rawRows = mapRows(snap)
    } catch (queryErr: unknown) {
      // Fallback if a composite index is missing for the selected combination.
      const message = queryErr instanceof Error ? queryErr.message : ''
      const needsIndex = message.toLowerCase().includes('index')
      if (!needsIndex) throw queryErr
      const fallbackLimit = Math.max(limit, 2000)
      const fallbackSnap = await baseRef.orderBy('completedAt', 'desc').limit(fallbackLimit).get()
      rawRows = mapRows(fallbackSnap)
    }

    const executions = rawRows.filter((row) => {
      if (status && row.status !== status) return false
      if (department && row.department !== department) return false
      if (fromTs > 0 && row.completedAt < fromTs) return false
      if (toTs > 0 && row.completedAt > toTs) return false
      if (!q) return true
      const text = `${row.eventId} ${row.eventSummary} ${row.department} ${row.templateName} ${row.completedByName} ${row.status}`.toLowerCase()
      return text.includes(q)
    }).slice(0, limit)

    return NextResponse.json({ executions }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
