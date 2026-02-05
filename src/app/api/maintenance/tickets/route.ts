import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'
import {
  buildTicketBody,
  notifyMaintenanceManagers,
} from '@/lib/maintenanceNotifications'
import admin from 'firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionUser = {
  id: string
  name?: string
  role?: string
  department?: string
}

type TicketPayload = {
  location?: string
  machine?: string
  description?: string
  priority?: 'urgent' | 'alta' | 'normal' | 'baixa'
  imageUrl?: string | null
  imagePath?: string | null
  imageMeta?: { size?: number; type?: string } | null
  source?: 'manual' | 'incidencia' | 'whatsblapp'
  status?: string
  incidentNumber?: string
  plannedStart?: number | null
  plannedEnd?: number | null
  estimatedMinutes?: number | null
}

const normalizePriority = (value?: string) => {
  const v = (value || '').trim().toLowerCase()
  if (v === 'urgent') return 'urgent'
  if (v === 'alta') return 'alta'
  if (v === 'baixa') return 'baixa'
  return 'normal'
}

const normalizeStatus = (value?: string) => {
  const v = (value || '').trim().toLowerCase()
  if (v === 'assignat') return 'assignat'
  if (v === 'en_curs' || v === 'en curs') return 'en_curs'
  if (v === 'espera') return 'espera'
  if (v === 'resolut') return 'resolut'
  if (v === 'validat') return 'validat'
  return 'nou'
}

async function generateTicketCode(): Promise<string> {
  const counterRef = db.collection('counters').doc('maintenanceTickets')
  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.value as number) || 0
    const updated = current + 1
    tx.set(counterRef, { value: updated }, { merge: true })
    return updated
  })
  return `TIC${String(next).padStart(6, '0')}`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const role = normalizeRole(user.role || '')
  const deptRaw = (user.department || '').toString()
  const dept = deptRaw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
  if (role !== 'admin' && role !== 'direccio' && role !== 'cap' && role !== 'treballador') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') || 'all').toLowerCase()
  const priority = (searchParams.get('priority') || 'all').toLowerCase()
  const location = (searchParams.get('location') || '').trim()
  const assignedToId = (searchParams.get('assignedToId') || '').trim()

  try {
    const snap = await db.collection('maintenanceTickets').orderBy('createdAt', 'desc').get()
    let tickets = snap.docs.map((doc) => {
      const data = doc.data() as any
      const createdAt =
        data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || ''
      return {
        id: doc.id,
        ...data,
        status: normalizeStatus(data.status),
        priority: normalizePriority(data.priority),
        createdAt,
      }
    })

    if (status && status !== 'all') {
      tickets = tickets.filter((t: any) => normalizeStatus(t.status) === status)
    }
    if (priority && priority !== 'all') {
      tickets = tickets.filter((t: any) => normalizePriority(t.priority) === priority)
    }
    if (location) {
      tickets = tickets.filter((t: any) => String(t.location || '') === location)
    }
    if (role === 'treballador' && dept === 'manteniment') {
      tickets = tickets.filter((t: any) =>
        Array.isArray(t.assignedToIds) ? t.assignedToIds.includes(user.id) : false
      )
    } else if (assignedToId) {
      tickets = tickets.filter((t: any) =>
        Array.isArray(t.assignedToIds) ? t.assignedToIds.includes(assignedToId) : false
      )
    }

    return NextResponse.json({ tickets })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const role = normalizeRole(user.role || '')
  if (role !== 'admin' && role !== 'direccio' && role !== 'cap') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as TicketPayload
    const location = (body.location || '').trim()
    const machine = (body.machine || '').trim()
    const description = (body.description || '').trim()
    const priority = normalizePriority(body.priority)
    const status = normalizeStatus(body.status)

    const isWhatsBlapp = body.source === 'whatsblapp'

    if (!location || !description || (!isWhatsBlapp && !machine)) {
      return NextResponse.json({ error: 'Falten camps obligatoris' }, { status: 400 })
    }

    const now = Date.now()
    const incidentNumber = (body.incidentNumber || '').trim()
    const ticketCode = incidentNumber || (await generateTicketCode())
    const doc = await db.collection('maintenanceTickets').add({
      ticketCode,
      incidentNumber: incidentNumber || null,
      location,
      machine: machine || '',
      description,
      priority,
      status,
      createdAt: now,
      createdById: user.id,
      createdByName: user.name || '',
      assignedToIds: [],
      assignedToNames: [],
      assignedAt: null,
      assignedById: null,
      assignedByName: null,
      plannedStart: body.plannedStart || null,
      plannedEnd: body.plannedEnd || null,
      estimatedMinutes: body.estimatedMinutes || null,
      source: body.source || 'manual',
      imageUrl: body.imageUrl || null,
      imagePath: body.imagePath || null,
      imageMeta: body.imageMeta || null,
      needsVehicle: false,
      vehicleId: null,
      vehiclePlate: null,
      statusHistory: [
        {
          status,
          at: now,
          byId: user.id,
          byName: user.name || '',
        },
      ],
    })

    await notifyMaintenanceManagers({
      payload: {
        type: 'maintenance_ticket_new',
        title: 'Nou ticket de manteniment',
        body: buildTicketBody({ machine, location, description }),
        ticketId: doc.id,
        ticketCode,
        status,
        priority,
        location,
        machine,
        source: body.source || 'manual',
      },
      excludeIds: [user.id],
    })

    return NextResponse.json({ id: doc.id }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
