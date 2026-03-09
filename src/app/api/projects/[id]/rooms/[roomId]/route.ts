export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db, storageAdmin } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'
import { syncProjectRoomOpsChannel } from '@/lib/projectRoomOps'

type SessionUser = {
  id: string
  name?: string
  role?: string
}

const EMPTY_KICKOFF = {
  date: '',
  startTime: '',
  durationMinutes: 60,
  notes: '',
  minutes: '',
  minutesStatus: 'open',
  minutesAuthor: '',
  minutesClosedAt: '',
  minutesUpdatedAt: '',
  excludedKeys: [],
  attendees: [],
  status: '',
  graphWebLink: '',
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const buildAutoRoomFromBlock = (data: Record<string, unknown>, roomId: string) => {
  if (!roomId.startsWith('room-block-')) return null

  const blockId = roomId.replace('room-block-', '')
  const blocks = Array.isArray(data.blocks) ? (data.blocks as Record<string, unknown>[]) : []
  const block = blocks.find((item) => String(item.id || '') === blockId)
  if (!block) return null

  const tasks = Array.isArray(block.tasks) ? (block.tasks as Record<string, unknown>[]) : []
  const participants = [...new Set([
    String(data.owner || ''),
    String(block.owner || ''),
    ...tasks.map((task) => String(task.owner || '')),
  ].filter(Boolean))]
  const departments = Array.isArray(block.departments)
    ? (block.departments as unknown[]).map(String).filter(Boolean)
    : [String(block.department || '')].filter(Boolean)

  return {
    id: roomId,
    name: String(block.name || departments[0] || block.department || 'Sala de bloc'),
    kind: 'block',
    blockId,
    opsChannelId: '',
    opsChannelName: '',
    opsChannelSource: 'projects',
    opsSyncedAt: 0,
    departments,
    participants,
    participantDetails: participants.map((name) => ({ name })),
    notes: '',
    documents: [],
    messages: [],
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const user = session.user as SessionUser
  if (normalizeRole(user.role || '') !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

async function uploadDocument(file: File, projectId: string, roomId: string) {
  const bytes = Buffer.from(await file.arrayBuffer())
  const fileName = file.name || `document-${Date.now()}`
  const path = `projects/${projectId}/rooms/${roomId}/${Date.now()}-${fileName.replace(/\s+/g, '_')}`

  const bucket = storageAdmin.bucket()
  const fileRef = bucket.file(path)
  await fileRef.save(bytes, {
    contentType: file.type || 'application/octet-stream',
    resumable: false,
  })

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
  })

  return {
    id: `room-doc-${Date.now()}`,
    name: file.name || '',
    label: file.name || 'Document de sala',
    category: 'other',
    path,
    url,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, roomId } = await params
    const projectRef = db.collection('projects').doc(id)
    const snap = await projectRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Projecte no trobat' }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const rooms = Array.isArray(data.rooms) ? [...(data.rooms as Record<string, unknown>[])] : []
    let room = rooms.find((item) => String(item.id || '') === roomId) || null

    if (!room) {
      room = buildAutoRoomFromBlock(data, roomId)
      if (!room) {
        return NextResponse.json({ error: 'Sala no trobada' }, { status: 404 })
      }
      rooms.push(room)
    }

    const blockId = String(room.blockId || '')
    const blocks = Array.isArray(data.blocks) ? (data.blocks as Record<string, unknown>[]) : []
    const linkedBlock = blocks.find((item) => String(item.id || '') === blockId) || null
    const roomDepartments = Array.isArray(room.departments) ? room.departments.map(String).filter(Boolean) : []
    const allowedDepartments = new Set(roomDepartments.map(normalizeText))
    const knownNames = new Set([
      String(data.owner || ''),
      String(room.name || ''),
      String(room.blockId || ''),
      String(linkedBlock?.owner || ''),
      ...((Array.isArray(room.participants) ? room.participants : []) as unknown[]).map(String),
      ...((Array.isArray(linkedBlock?.tasks) ? linkedBlock?.tasks : []) as Record<string, unknown>[]).map((task) =>
        String(task.owner || '')
      ),
    ].filter(Boolean))

    const usersSnap = await db.collection('users').get()
    const users = usersSnap.docs
      .map((doc) => {
        const user = doc.data() as Record<string, unknown>
        return {
          id: doc.id,
          name: String(user.name || '').trim(),
          department: String(user.department || '').trim(),
          role: String(user.role || '').trim(),
        }
      })
      .filter((user) => {
        if (!user.name) return false
        if (knownNames.has(user.name)) return true
        if (allowedDepartments.size === 0) return true
        return allowedDepartments.has(normalizeText(user.department))
      })

    return NextResponse.json({
      project: {
        id,
        name: String(data.name || ''),
        sponsor: String(data.sponsor || ''),
        owner: String(data.owner || ''),
        context: String(data.context || ''),
        strategy: String(data.strategy || ''),
        risks: String(data.risks || ''),
        startDate: String(data.startDate || ''),
        launchDate: String(data.launchDate || ''),
        budget: String(data.budget || ''),
        departments: Array.isArray(data.departments) ? (data.departments as string[]) : [],
        phase: String(data.phase || ''),
        status: String(data.status || ''),
        blocks: linkedBlock ? [linkedBlock] : [],
        rooms: [room],
        document: data.document ?? null,
        documents: Array.isArray(data.documents) ? data.documents : [],
        kickoff:
          data.kickoff && typeof data.kickoff === 'object'
            ? data.kickoff
            : EMPTY_KICKOFF,
      },
      users,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, roomId } = await params
    const payload = (await req.json()) as {
      room?: Record<string, unknown>
      tasks?: Array<Record<string, unknown>>
    }

    const projectRef = db.collection('projects').doc(id)
    const snap = await projectRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Projecte no trobat' }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const rooms = Array.isArray(data.rooms) ? [...(data.rooms as Record<string, unknown>[])] : []
    let roomIndex = rooms.findIndex((room) => String(room.id || '') === roomId)
    if (roomIndex === -1) {
      const autoRoom = buildAutoRoomFromBlock(data, roomId)
      if (!autoRoom) {
        return NextResponse.json({ error: 'Sala no trobada' }, { status: 404 })
      }
      rooms.push(autoRoom)
      roomIndex = rooms.length - 1
    }

    if (payload.room) {
      rooms[roomIndex] = {
        ...rooms[roomIndex],
        ...payload.room,
      }
    }

    const nextPayload: Record<string, unknown> = {
      rooms,
      updatedAt: Date.now(),
      updatedById: auth.user.id,
      updatedByName: auth.user.name || '',
    }

    if (Array.isArray(payload.tasks) && String(rooms[roomIndex].blockId || '')) {
      const blocks = Array.isArray(data.blocks) ? [...(data.blocks as Record<string, unknown>[])] : []
      const blockIndex = blocks.findIndex(
        (block) => String(block.id || '') === String(rooms[roomIndex].blockId || '')
      )
      if (blockIndex >= 0) {
        blocks[blockIndex] = {
          ...blocks[blockIndex],
          tasks: payload.tasks,
        }
        nextPayload.blocks = blocks
      }
    }

    const syncResult = await syncProjectRoomOpsChannel({
      project: {
        id,
        name: String(data.name || ''),
        owner: String(data.owner || ''),
        rooms,
        blocks: Array.isArray(nextPayload.blocks)
          ? (nextPayload.blocks as Record<string, unknown>[])
          : Array.isArray(data.blocks)
            ? (data.blocks as Record<string, unknown>[])
            : [],
      },
      roomId,
    })

    nextPayload.rooms = syncResult.rooms

    await projectRef.set(nextPayload, { merge: true })

    return NextResponse.json({ ok: true, room: syncResult.room, opsChannelId: syncResult.channelId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, roomId } = await params
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: 'Arxiu invalid' }, { status: 400 })
    }

    const projectRef = db.collection('projects').doc(id)
    const snap = await projectRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Projecte no trobat' }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const rooms = Array.isArray(data.rooms) ? [...(data.rooms as Record<string, unknown>[])] : []
    let roomIndex = rooms.findIndex((room) => String(room.id || '') === roomId)
    if (roomIndex === -1) {
      const autoRoom = buildAutoRoomFromBlock(data, roomId)
      if (!autoRoom) {
        return NextResponse.json({ error: 'Sala no trobada' }, { status: 404 })
      }
      rooms.push(autoRoom)
      roomIndex = rooms.length - 1
    }

    const stored = await uploadDocument(file, id, roomId)
    const currentDocs = Array.isArray(rooms[roomIndex].documents)
      ? (rooms[roomIndex].documents as Record<string, unknown>[])
      : []

    rooms[roomIndex] = {
      ...rooms[roomIndex],
      documents: [...currentDocs, stored],
    }

    const synced = await syncProjectRoomOpsChannel({
      project: {
        id,
        name: String(data.name || ''),
        owner: String(data.owner || ''),
        rooms,
        blocks: Array.isArray(data.blocks) ? (data.blocks as Record<string, unknown>[]) : [],
      },
      roomId,
    })

    await projectRef.set(
      {
        rooms: synced.rooms,
        updatedAt: Date.now(),
        updatedById: auth.user.id,
        updatedByName: auth.user.name || '',
      },
      { merge: true }
    )

    return NextResponse.json({ document: stored, room: synced.room, opsChannelId: synced.channelId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, roomId } = await params
    const projectRef = db.collection('projects').doc(id)
    const snap = await projectRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Projecte no trobat' }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const rooms = Array.isArray(data.rooms) ? [...(data.rooms as Record<string, unknown>[])] : []
    let exists = rooms.some((room) => String(room.id || '') === roomId)
    if (!exists) {
      const autoRoom = buildAutoRoomFromBlock(data, roomId)
      if (!autoRoom) {
        return NextResponse.json({ error: 'Sala no trobada' }, { status: 404 })
      }
      rooms.push(autoRoom)
      exists = true
    }
    if (!exists) {
      return NextResponse.json({ error: 'Sala no trobada' }, { status: 404 })
    }

    const synced = await syncProjectRoomOpsChannel({
      project: {
        id,
        name: String(data.name || ''),
        owner: String(data.owner || ''),
        rooms,
        blocks: Array.isArray(data.blocks) ? (data.blocks as Record<string, unknown>[]) : [],
      },
      roomId,
    })

    await projectRef.set(
      {
        rooms: synced.rooms,
        updatedAt: Date.now(),
        updatedById: auth.user.id,
        updatedByName: auth.user.name || '',
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, room: synced.room, opsChannelId: synced.channelId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
