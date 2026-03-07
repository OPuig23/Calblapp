export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db, storageAdmin } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'
import Ably from 'ably'

type SessionUser = {
  id: string
  name?: string
  role?: string
}

const clean = (value: FormDataEntryValue | null) => String(value || '').trim()
const normLower = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

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

async function uploadDocument(file: File, projectId: string) {
  const bytes = Buffer.from(await file.arrayBuffer())
  const fileName = file.name || `document-${Date.now()}`
  const path = `projects/${projectId}/${Date.now()}-${fileName.replace(/\s+/g, '_')}`

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
    name: file.name || '',
    path,
    url,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

async function findUserByName(rawName: string) {
  const name = rawName.trim()
  if (!name) return null

  let snap = await db.collection('users').where('name', '==', name).limit(1).get()
  if (snap.empty) {
    snap = await db.collection('users').where('nameFold', '==', normLower(name)).limit(1).get()
  }

  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...(doc.data() as Record<string, unknown>) }
}

async function notifyProjectOwner(params: {
  userId: string
  projectId: string
  projectName: string
  baseUrl: string
}) {
  const { userId, projectId, projectName, baseUrl } = params
  const title = "T'han assignat un projecte"
  const body = `Ara ets responsable del projecte: ${projectName || 'Projecte'}`
  const now = Date.now()

  await db.collection('users').doc(userId).collection('notifications').add({
    title,
    body,
    createdAt: now,
    read: false,
    type: 'project_assignment',
    projectId,
  })

  const apiKey = process.env.ABLY_API_KEY
  if (apiKey) {
    try {
      const rest = new Ably.Rest({ key: apiKey })
      await rest.channels.get(`user:${userId}:notifications`).publish('created', {
        type: 'project_assignment',
        projectId,
        createdAt: now,
      })
    } catch (err) {
      console.error('[projects] Ably publish error', err)
    }
  }

  try {
    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        url: `/menu/projects/${projectId}`,
      }),
    })
  } catch (err) {
    console.error('[projects] push error', err)
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const snap = await db.collection('projects').doc(id).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ id: snap.id, ...(snap.data() as Record<string, unknown>) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const baseUrl = new URL(req.url).origin
    const form = await req.formData()
    const file = form.get('file')
    const document = file instanceof File && file.size > 0 ? await uploadDocument(file, id) : undefined
    const owner = clean(form.get('owner'))
    const ownerUser = owner ? await findUserByName(owner) : null
    const currentSnap = await db.collection('projects').doc(id).get()
    const currentData = currentSnap.exists ? (currentSnap.data() as Record<string, unknown>) : {}
    const previousOwnerUserId = String(currentData.ownerUserId || '')
    const previousOwner = String(currentData.owner || '')

    const payload: Record<string, unknown> = {
      name: clean(form.get('name')),
      sponsor: clean(form.get('sponsor')),
      owner,
      ownerUserId: owner ? ownerUser?.id || '' : previousOwnerUserId,
      context: clean(form.get('context')),
      strategy: clean(form.get('strategy')),
      risks: clean(form.get('risks')),
      startDate: clean(form.get('startDate')),
      launchDate: clean(form.get('launchDate')),
      budget: clean(form.get('budget')),
      phase: clean(form.get('phase')) || String(currentData.phase || 'initial'),
      status: clean(form.get('status')) || 'draft',
      updatedAt: Date.now(),
      updatedById: auth.user.id,
      updatedByName: auth.user.name || '',
    }

    const departmentsRaw = form.get('departments')
    if (departmentsRaw !== null) {
      try {
        payload.departments = JSON.parse(String(departmentsRaw))
      } catch {
        payload.departments = []
      }
    }

    const blocksRaw = form.get('blocks')
    if (blocksRaw !== null) {
      try {
        payload.blocks = JSON.parse(String(blocksRaw))
      } catch {
        payload.blocks = []
      }
    }

    if (document) {
      payload.document = document
    }

    const kickoffRaw = form.get('kickoff')
    if (kickoffRaw !== null) {
      try {
        payload.kickoff = JSON.parse(String(kickoffRaw))
      } catch {
        payload.kickoff = null
      }
    }

    await db.collection('projects').doc(id).set(payload, { merge: true })

    const hasOwnerChanged =
      Boolean(ownerUser?.id) &&
      (ownerUser.id !== previousOwnerUserId || owner !== previousOwner)

    if (hasOwnerChanged) {
      await notifyProjectOwner({
        userId: ownerUser!.id,
        projectId: id,
        projectName: String(payload.name || currentData.name || ''),
        baseUrl,
      })
    }

    return NextResponse.json({ id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
