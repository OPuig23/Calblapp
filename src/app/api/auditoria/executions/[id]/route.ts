export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin, storageAdmin } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

type Department = 'comercial' | 'serveis' | 'cuina' | 'logistica' | 'deco'

type TemplateItem = { id?: string; type?: string }
type TemplateBlock = { id?: string; title?: string; weight?: number; items?: TemplateItem[] }

type ReviewBlockCheck = {
  blockId: string
  isValid: boolean
}

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

function round2(num: number) {
  return Math.round(num * 100) / 100
}

function normalizeBlockChecks(input: unknown): ReviewBlockCheck[] {
  if (!Array.isArray(input)) return []
  return input
    .map((x) => {
      const v = (x || {}) as { blockId?: unknown; isValid?: unknown }
      const blockId = String(v.blockId || '').trim()
      if (!blockId || typeof v.isValid !== 'boolean') return null
      return { blockId, isValid: v.isValid }
    })
    .filter((x): x is ReviewBlockCheck => Boolean(x))
}

function complianceFromChecks(blocksInput: unknown, checksInput: unknown) {
  const blocks = Array.isArray(blocksInput) ? (blocksInput as TemplateBlock[]) : []
  const checks = normalizeBlockChecks(checksInput)
  if (!blocks.length || !checks.length) return 0

  const byId = new Map(checks.map((c) => [c.blockId, c.isValid]))
  let weighted = 0
  let totalWeight = 0

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const blockId = String(block?.id || `b-${i + 1}`)
    const weight = Number(block?.weight || 0)
    if (weight <= 0) continue
    totalWeight += weight
    if (byId.get(blockId) === true) weighted += weight
  }

  if (totalWeight <= 0) return 0
  return round2((weighted / totalWeight) * 100)
}

function checksCompletion(blocksInput: unknown, checksInput: unknown) {
  const blocks = Array.isArray(blocksInput) ? (blocksInput as TemplateBlock[]) : []
  const checks = normalizeBlockChecks(checksInput)
  if (!blocks.length) return false
  const ids = new Set(checks.map((c) => c.blockId))
  return blocks.every((b, i) => ids.has(String(b?.id || `b-${i + 1}`)))
}

async function getTemplateBlocksForRun(run: Record<string, unknown>) {
  const snapshot = Array.isArray(run.templateSnapshot) ? (run.templateSnapshot as TemplateBlock[]) : []
  if (snapshot.length) return snapshot

  const templateId = String(run.templateId || '').trim()
  if (!templateId) return []

  const tpl = await firestoreAdmin.collection('audit_templates').doc(templateId).get()
  if (!tpl.exists) return []
  const data = tpl.data() as Record<string, unknown>
  return Array.isArray(data.blocks) ? (data.blocks as TemplateBlock[]) : []
}

async function authContext() {
  const session = await getServerSession(authOptions)
  const user = session?.user as
    | { id?: string; role?: string; department?: string; name?: string | null; email?: string | null }
    | undefined

  if (!user?.id) return { error: NextResponse.json({ error: 'No autenticat' }, { status: 401 }) }
  const role = normalizeRole(user.role || '')
  const department = normalizeDept(user.department || '')

  if (!['admin', 'direccio', 'cap'].includes(role)) {
    return { error: NextResponse.json({ error: 'Sense permisos' }, { status: 403 }) }
  }

  return { user, role, department }
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authContext()
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const ref = firestoreAdmin.collection('audit_runs').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Execucio no trobada' }, { status: 404 })

    const run = snap.data() as Record<string, unknown>
    const runDepartment = normalizeDept(String(run.department || ''))

    if (auth.role === 'cap' && (!runDepartment || auth.department !== runDepartment)) {
      return NextResponse.json({ error: 'Sense permisos per aquest departament' }, { status: 403 })
    }

    const templateBlocks = await getTemplateBlocksForRun(run)
    const reviewBlockChecks = normalizeBlockChecks(run.reviewBlockChecks)
    const compliancePct = Number(run.compliancePct || complianceFromChecks(templateBlocks, reviewBlockChecks))

    return NextResponse.json(
      {
        execution: {
          id: snap.id,
          ...run,
          templateBlocks,
          reviewBlockChecks,
          compliancePct: round2(compliancePct),
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authContext()
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = (await req.json()) as {
      action?: 'reopen'
      note?: string
      blockChecks?: Array<{ blockId?: string; isValid?: boolean }>
    }
    const action = body?.action === 'reopen' ? 'reopen' : null

    const note = String(body?.note || '').trim()

    const ref = firestoreAdmin.collection('audit_runs').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Execucio no trobada' }, { status: 404 })

    const run = snap.data() as Record<string, unknown>
    const runDepartment = normalizeDept(String(run.department || ''))
    if (auth.role === 'cap' && (!runDepartment || auth.department !== runDepartment)) {
      return NextResponse.json({ error: 'Sense permisos per aquest departament' }, { status: 403 })
    }

    if (action === 'reopen') {
      const now = Date.now()
      await ref.set(
        {
          status: 'completed',
          compliancePct: 0,
          reviewBlockChecks: [],
          reviewNote: null,
          reviewedAt: null,
          reviewedById: null,
          reviewedByName: null,
          updatedAt: now,
        },
        { merge: true }
      )
      return NextResponse.json({ ok: true, status: 'completed' }, { status: 200 })
    }

    const templateBlocks = await getTemplateBlocksForRun(run)
    const blockChecks = normalizeBlockChecks(body.blockChecks)

    if (!checksCompletion(templateBlocks, blockChecks)) {
      return NextResponse.json({ error: 'Cal validar tots els blocs (si o no)' }, { status: 400 })
    }

    const allValid = blockChecks.every((b) => b.isValid)
    const status = allValid ? 'validated' : 'rejected'
    const compliancePct = complianceFromChecks(templateBlocks, blockChecks)
    const now = Date.now()

    await ref.set(
      {
        status,
        compliancePct,
        reviewBlockChecks: blockChecks,
        reviewNote: note || null,
        reviewedAt: now,
        reviewedById: auth.user.id,
        reviewedByName: auth.user.name || auth.user.email || 'Usuari',
        updatedAt: now,
      },
      { merge: true }
    )

    return NextResponse.json(
      {
        ok: true,
        status,
        compliancePct,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authContext()
    if ('error' in auth) return auth.error
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Nomes admin pot eliminar auditories' }, { status: 403 })
    }

    const { id } = await ctx.params
    const ref = firestoreAdmin.collection('audit_runs').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Execucio no trobada' }, { status: 404 })

    const run = snap.data() as Record<string, unknown>
    const answers = Array.isArray(run.auditAnswers) ? (run.auditAnswers as Array<Record<string, unknown>>) : []
    const paths = new Set<string>()

    answers.forEach((answer) => {
      const photos = Array.isArray(answer.photos) ? (answer.photos as Array<Record<string, unknown>>) : []
      photos.forEach((photo) => {
        const path = String(photo.path || '').trim()
        if (path) paths.add(path)
      })
    })

    const bucket = storageAdmin.bucket()
    await Promise.all(
      Array.from(paths).map(async (path) => {
        try {
          await bucket.file(path).delete()
        } catch {
          // ignore missing/orphan files
        }
      })
    )

    await ref.delete()
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
